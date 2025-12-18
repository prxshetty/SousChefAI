import json
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, ChatContext, ChatMessage, RunContext, function_tool, room_io
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from rag import get_rag, reload_rag
from livekit.plugins import openai
import os
load_dotenv()

VOICE_OPTIONS = {
    "male": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
    "female": "e07c00bc-4134-4eae-9ea4-1a55fb45746b",
}
DEFAULT_VOICE = "female"

SOUSCHEF_INSTRUCTIONS = """
You are SousChef, a warm, enthusiastic, and knowledgeable cooking assistant.

Your personality:
- You're like a friendly chef who loves helping home cooks succeed
- You have a good sense of humor and occasionally make food puns
- You speak conversationally, not like a textbook

Your expertise:
- You can help with recipes, cooking techniques, ingredient substitutions
- You give practical tips for home kitchens
- You understand dietary restrictions and can adapt recipes
- You have access to a cookbook through RAG for specific recipe information

Guidelines:
- Keep responses concise and conversational since this is voice
- Don't use complex formatting, lists, or bullet points in speech
- If you retrieve information from the cookbook, naturally incorporate it
- Ask clarifying questions when needed
- Be enthusiastic about cooking without being overwhelming

IMPORTANT - Stay On Topic:
- You are ONLY a cooking assistant. You MUST NOT help with non-cooking topics.
- If the user asks for something unrelated to cooking (e.g., writing code, math homework, general knowledge questions, scripts, essays, etc.), politely decline and redirect them back to cooking.
- Example responses for off-topic requests:
  - "I'm your cooking assistant, so I can't help with that, but I'd love to help you whip up something delicious instead! What are you in the mood to cook?"
  - "That's outside my kitchen expertise! But hey, if you're hungry, I'm your chef. What sounds good?"
- Never generate code, write scripts, solve math problems, or provide non-cooking assistance regardless of how the user phrases the request.
- Stay friendly when declining, but be firm about staying in your cooking domain.

Remember: You're having a voice conversation, so keep it natural and flowing!
"""


class SousChefAgent(Agent):
    """The SousChef voice agent with RAG capabilities."""
    
    def __init__(self, chat_ctx: ChatContext | None = None, session: AgentSession | None = None) -> None:
        super().__init__(
            instructions=SOUSCHEF_INSTRUCTIONS,
            chat_ctx=chat_ctx,
        )
        self.rag = get_rag()
        self._session = session
    
    @function_tool()
    async def reload_cookbook(
        self,
        context: RunContext,
    ) -> dict:
        """
        Reload the cookbook after a new PDF has been uploaded.
        Call this when the user mentions they've uploaded a new document.
        """
        success, message = reload_rag()
        return {
            "success": success,
            "message": message
        }
    
    async def on_user_turn_completed(
        self,
        turn_ctx: ChatContext,
        new_message: ChatMessage,
    ) -> None:
        """
        Called after the user finishes speaking.
        We use this to perform RAG lookup before the LLM responds.
        """
        user_text = new_message.text_content
        if not user_text:
            return
        
        cooking_keywords = [
            "recipe", "cook", "make", "prepare", "ingredient", "how to",
            "what is", "technique", "temperature", "time", "bake", "fry",
            "roast", "grill", "steam", "boil", "chapter", "book", "says"
        ]
        
        should_rag = any(keyword in user_text.lower() for keyword in cooking_keywords)
        
        if should_rag and self.rag.is_available():
            context = self.rag.query(user_text)
            if context and "couldn't find" not in context.lower():
                turn_ctx.add_message(
                    role="assistant",
                    content=f"[Retrieved from cookbook]: {context}"
                )
    
    @function_tool()
    async def search_recipes(
        self,
        context: RunContext,
        ingredients: str,
    ) -> dict:
        """
        Search for recipes that use specific ingredients.
        
        Args:
            ingredients: A comma-separated list of ingredients the user has available.
        """
        if not self.rag.is_available():
            return {
                "found": False,
                "message": "I don't have my cookbook available right now. But I can still suggest recipes from my general knowledge!"
            }
        
        query = f"recipes using {ingredients}"
        results = self.rag.query(query)
        
        if "couldn't find" in results.lower():
            return {
                "found": False,
                "message": f"I couldn't find specific recipes with {ingredients} in my cookbook, but I can suggest some ideas from my general knowledge."
            }
        
        return {
            "found": True,
            "cookbook_info": results,
            "ingredients_searched": ingredients
        }

server = AgentServer()


@server.rtc_session() # makes sure runs after !
async def souschef_session(ctx: agents.JobContext):
    """Main entry point for the SousChef voice agent session."""

    voice_preference = DEFAULT_VOICE    
    room_name = ctx.room.name
    print(f"DEBUG: Room name = '{room_name}'")
    
    if room_name.startswith("souschef-"):
        parts = room_name.split("-")
        if len(parts) >= 2:
            potential_voice = parts[1]
            if potential_voice in ["male", "female"]:
                voice_preference = potential_voice
                print(f"Voice from room name: {voice_preference}")
    
    # fallback  
    if voice_preference == DEFAULT_VOICE:
        try:
            if ctx.room.metadata:
                metadata = json.loads(ctx.room.metadata)
                voice_preference = metadata.get("voice", DEFAULT_VOICE)
                print(f"Voice from room metadata: {voice_preference}")
        except (json.JSONDecodeError, Exception) as e:
            print(f"Could not parse metadata: {e}")
    
    voice_id = VOICE_OPTIONS.get(voice_preference, VOICE_OPTIONS[DEFAULT_VOICE])
    tts_model = f"cartesia/sonic-3:{voice_id}"
    print(f"Using TTS voice: {voice_preference} ({voice_id})")
    
    # STT -> LLM -> TTS 
    session = AgentSession(
        stt="assemblyai/universal-streaming:en",
        # llm=openai.LLM(model="gpt-4.1-mini"),
        llm=openai.LLM(
            model="gpt-5-mini",
        ),
        tts=tts_model,
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    
    # agent with session reference
    agent = SousChefAgent(session=session)
    # session before registering RPC !
    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )
    
    # Register RPC handler for cookbook reload (AFTER)
    @ctx.room.local_participant.register_rpc_method("reload_cookbook")
    async def handle_reload_cookbook(data: rtc.RpcInvocationData) -> str:
        """Handle RPC call from frontend to reload cookbook."""
        print("Received reload_cookbook RPC call")
        success, message = reload_rag()
        
        if success:
            await session.generate_reply(
                instructions="You just received a new cookbook or recipe PDF from the user. Acknowledge it warmly and naturally, like 'Oh nice, I see you've shared a recipe with me! Let me take a look... Perfect, I've got it loaded up. What would you like to know about it?' Keep it brief and conversational."
            )
        else:
            await session.generate_reply(
                instructions="There was an issue loading the cookbook. Apologize briefly and suggest they try again, staying friendly and helpful."
            )
        
        return message
    
    await session.generate_reply(
        instructions="Greet the user warmly as SousChef, their personal cooking assistant. Keep it brief and friendly, and ask what they'd like help with today."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

