import json
import os
from pathlib import Path
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, ChatContext, ChatMessage, RunContext, function_tool, room_io
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.plugins import google
env_file = Path(__file__).parent / ".env.local"
load_dotenv(env_file)

from rag import get_rag, reload_rag, clear_rag, CookbookRAG
from tools.cookbook import CookbookMixin
from tools.timer import TimerMixin
from tools.shopping import ShoppingListMixin
from tools.cooking import CookingMixin

GEMINI_VOICE_OPTIONS = {
    "male": "Charon",   
    "female": "Aoede",  
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

Your tools:
1. search_cookbook - Search the user's uploaded cookbook/PDF for recipes and info
   - Use when the user asks about their cookbook or references their uploaded PDF
   - Use proactively when a cookbook is uploaded AND the user asks for specific recipes
   - DON'T use for general cooking questions you can answer from knowledge (like "how to boil water")
   - If no cookbook is uploaded, just use your general knowledge

2. set_timer - Set cooking timers that display in the user's UI
   - Use when user explicitly asks for a timer
   - Use when giving cooking steps with specific times (offer to set timer)

3. clear_timers - Clear all active timers
   - Use when user says "cancel the timer" or "never mind"

4. add_to_shopping_list - Add ingredients to user's shopping list
   - Use when user says "add X to my shopping list" or "I need to buy X"

5. remove_from_shopping_list - Remove specific items from the list
   - Use when user says "I already have eggs" or "remove butter from my list"

6. clear_shopping_list - Clear the entire shopping list
    
7. reload_cookbook - Reload after user uploads a new PDF (called automatically)

8. generate_recipe_plan - Create a step-by-step plan for a specific recipe
   - Use when user wants to cook something specific from the cookbook
   - e.g. "I want to make the lasagna from my book"

9. start_cooking_mode - Start the interactive cooking session
   - Use ONLY when user confirms they are ready to start cooking the generated plan
   - e.g. "Yes, let's start cooking!"

10. next_step - Go to the next instruction
    - Use when user says "next", "done", "okay", "what's next"

11. previous_step - Go back to the previous instruction
    - Use when user says "go back", "repeat that", "previous step"

12. go_to_step - Navigate to a specific step number
    - Use when user says "go to step 3", "skip to step 5", "let's move to the next step"
    - For "next step" calculate: current step + 1

Guidelines:
- Keep responses concise and conversational since this is voice
- Don't use complex formatting, lists, or bullet points in speech
- If you find cookbook info, naturally weave it into your response
- Ask clarifying questions when needed
- Be enthusiastic about cooking without being overwhelming

IMPORTANT - Stay On Topic:
- You are ONLY a cooking assistant. You MUST NOT help with non-cooking topics.
- If asked about non-cooking topics, politely redirect to cooking.
- Never generate code, write scripts, or help with non-cooking tasks.

Remember: You're having a voice conversation, so keep it natural and flowing!
"""


class SousChefAgent(Agent, CookbookMixin, TimerMixin, ShoppingListMixin, CookingMixin):
    """The SousChef voice agent with RAG capabilities."""
    
    def __init__(self, chat_ctx: ChatContext | None = None, session: AgentSession | None = None, room = None, api_key: str = None) -> None:
        super().__init__(
            instructions=SOUSCHEF_INSTRUCTIONS,
            chat_ctx=chat_ctx,
        )
        if api_key:
             print(f"Using custom API key for RAG")
             self.rag = CookbookRAG(api_key=api_key)
        else:
             self.rag = get_rag()
        self._session = session
        self._room = room


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
    
    api_key = None
    if ctx.room.metadata:
        try:
            metadata = json.loads(ctx.room.metadata)
            voice_preference = metadata.get("voice", voice_preference)
            api_key = metadata.get("apiKey")
            if api_key:
                print("Received custom API key from client")
        except (json.JSONDecodeError, Exception) as e:
            print(f"Could not parse metadata: {e}")
    
    voice_name = GEMINI_VOICE_OPTIONS.get(voice_preference, GEMINI_VOICE_OPTIONS[DEFAULT_VOICE])
    print(f"Using Gemini voice: {voice_preference} ({voice_name})")
    
    # Fallback for API Key
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("WARNING: GOOGLE_API_KEY not found in environment variables")
        else:
             # Mask key for privacy in logs
            masked = f"{api_key[:4]}...{api_key[-4:]}"
            print(f"Using GOOGLE_API_KEY from environment: {masked}")
    
    # Gemini Live API - Native audio-to-audio (no STT/TTS needed!)
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-09-2025",  # Latest stable Live API model
            voice=voice_name,
            api_key=api_key,
            instructions=SOUSCHEF_INSTRUCTIONS,
            temperature=0.8,
            enable_affective_dialog=True,  # Natural emotional responses
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    
    # agent with session and room reference now for data publishing
    agent = SousChefAgent(session=session, room=ctx.room, api_key=api_key)
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
    
    # Handle UI step navigation clicks to sync agent state
    def handle_data_received(payload: bytes, participant: rtc.Participant | None = None, kind: rtc.DataPacketKind | None = None, topic: str | None = None):
        try:
            payload_data = payload.data if hasattr(payload, 'data') else payload
            if isinstance(payload_data, bytes):
                data = json.loads(payload_data.decode('utf-8'))
            else:
                data = json.loads(str(payload_data))
            if data.get("type") == "ui_step_change":
                action = data.get("action")
                step_index = data.get("step_index")
                
                # Update agent's internal state to match UI
                if agent.current_recipe and agent.cooking_mode_active:
                    if action == "next" and step_index < len(agent.current_recipe.steps):
                        # Mark current step as completed
                        current_idx = agent.current_recipe.current_step_index
                        if current_idx < len(agent.current_recipe.steps):
                            agent.current_recipe.steps[current_idx].completed = True
                        agent.current_recipe.current_step_index = step_index
                        print(f"UI navigated to step {step_index + 1}")
                    elif action == "previous" and step_index >= 0:
                        agent.current_recipe.current_step_index = step_index
                        print(f"UI navigated back to step {step_index + 1}")
            
            if data.get("type") == "request_recipe":
                recipe_title = data.get("title")
                if recipe_title:
                    print(f"UI requested recipe: {recipe_title}")
                    import asyncio
                    asyncio.create_task(agent.generate_recipe_plan(None, recipe_title))

        except (json.JSONDecodeError, Exception) as e:
            print(f"Error handling UI step change: {e}")
    
    ctx.room.on("data_received", handle_data_received)
    
    # Register RPC handler for cookbook reload (AFTER)
    @ctx.room.local_participant.register_rpc_method("reload_cookbook")
    async def handle_reload_cookbook(data: rtc.RpcInvocationData) -> str:
        """Handle RPC call from frontend to reload cookbook."""
        import asyncio
        print("Received reload_cookbook RPC call")
        
        await session.generate_reply(
            instructions="The user just uploaded a cookbook PDF. Acknowledge it immediately like 'Oh nice, I see you've uploaded a recipe! I'll go through it now - feel free to ask me anything in the meantime!' Keep it brief and friendly."
        )
        
        # Running the blocking indexing in a thread to not block the event loop so ai can still respond. ( Realtime wohoo)
        # Use agent.rag instead of global reload_rag
        success, message = await asyncio.to_thread(agent.rag.reload_index)
        
        if success:
            await session.generate_reply(
                instructions="You just finished processing the cookbook. Naturally interrupt to let the user know, like 'Alright, I've got your recipe loaded up now! What would you like to know about it?' Keep it brief and conversational."
            )
        else:
            await session.generate_reply(
                instructions="There was an issue loading the cookbook. Apologize briefly and suggest they try again."
            )
        
        return message
    
    @ctx.room.local_participant.register_rpc_method("clear_cookbook")
    async def handle_clear_cookbook(data: rtc.RpcInvocationData) -> str:
        """Handle RPC call from frontend to clear cookbook."""
        import asyncio
        print("Received clear_cookbook RPC call")
        success, message = await asyncio.to_thread(agent.rag.clear_index)
        
        if success:
            await session.generate_reply(
                instructions="The user just cleared all the cookbook data. Acknowledge it briefly like 'Sure thing! I've cleared out all the recipes from my memory. Feel free to upload a new cookbook whenever you're ready!'"
            )
        else:
            await session.generate_reply(
                instructions="There was an issue clearing the cookbook. Apologize briefly and explain what happened."
            )
        
        return message
    
    @ctx.room.local_participant.register_rpc_method("clear_cookbook_silent")
    async def handle_clear_cookbook_silent(data: rtc.RpcInvocationData) -> str:
        """Silent clear on disconnect - no voice response."""
        import asyncio
        print("Received clear_cookbook_silent RPC call (session ending)")
        success, message = await asyncio.to_thread(agent.rag.clear_index)
        return message

    await session.generate_reply(
        instructions="Greet the user warmly as SousChef, their personal cooking assistant. Keep it brief and friendly, and ask what they'd like help with today."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

