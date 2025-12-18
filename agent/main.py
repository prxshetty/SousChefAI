import json
import os
from pathlib import Path
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, ChatContext, ChatMessage, RunContext, function_tool, room_io
from livekit.plugins import noise_cancellation, silero, speechmatics, deepgram
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.plugins import openai
env_file = Path(__file__).parent / ".env.local"
load_dotenv(env_file)
from rag import get_rag, reload_rag, clear_rag

VOICE_OPTIONS = {
    "male": "aura-2-odysseus-en",
    "female": "aura-2-asteria-en",
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


class SousChefAgent(Agent):
    """The SousChef voice agent with RAG capabilities."""
    
    def __init__(self, chat_ctx: ChatContext | None = None, session: AgentSession | None = None, room = None) -> None:
        super().__init__(
            instructions=SOUSCHEF_INSTRUCTIONS,
            chat_ctx=chat_ctx,
        )
        self.rag = get_rag()
        self._session = session
        self._room = room
    
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
    
    @function_tool()
    async def search_cookbook(
        self,
        context: RunContext,
        query: str,
    ) -> dict:
        """
        Search the user's uploaded cookbook/PDF for specific cooking information.
        
        Use this tool when:
        - The user explicitly asks about their cookbook ("what does my book say about...")
        - The user asks for a specific recipe that might be in their uploaded cookbook
        - The user references something they uploaded ("from that PDF I uploaded...")
        - A cookbook has been uploaded AND the question is specific enough that 
          the cookbook might have unique or personalized information
        
        DO NOT use this for:
        - Questions when no cookbook has been uploaded
        - Simple technique questions you can answer from general knowledge
        
        Args:
            query: What to search for in the cookbook (e.g., "pasta recipe", "chicken marinade")
        """
        if not self.rag.is_available():
            return {
                "found": False,
                "has_cookbook": False,
                "message": "No cookbook has been uploaded yet. I can still help with general cooking knowledge!"
            }
        
        results = self.rag.query(query)
        
        if "couldn't find" in results.lower():
            return {
                "found": False,
                "has_cookbook": True,
                "message": f"I couldn't find information about '{query}' in your cookbook, but I can help with my general cooking knowledge."
            }
        
        return {
            "found": True,
            "has_cookbook": True,
            "cookbook_content": results,
            "message": "Found relevant information in your cookbook."
        }
    
    @function_tool()
    async def set_timer(
        self,
        context: RunContext,
        minutes: int,
        label: str = "Timer",
    ) -> dict:
        """
        Set a cooking timer for the user. Use this when the user asks to set a timer,
        or when you recommend timing for a cooking step (e.g., "bake for 20 minutes").
        
        Args:
            minutes: Number of minutes for the timer (1-120).
            label: Optional. A short description of what the timer is for. 
                   If the user provides context (e.g., "for the pasta"), use that.
                   If not provided, defaults to "Timer".
        """
        import time as time_module
        
        minutes = max(1, min(120, minutes))
        timer_label = label if label else "Timer"
        
        if self._room:
            timer_data = json.dumps({
                "type": "timer",
                "action": "start",
                "minutes": minutes,
                "seconds": minutes * 60,
                "label": timer_label,
                "id": f"timer-{int(time_module.time() * 1000)}"
            })
            await self._room.local_participant.publish_data(
                timer_data.encode('utf-8'),
                reliable=True,
            )
            print(f"Timer data published: {timer_data}")
        
        return {
            "success": True,
            "timer_set": True,
            "minutes": minutes,
            "label": timer_label,
            "message": f"Timer set for {minutes} minute{'s' if minutes != 1 else ''}" + (f": {timer_label}" if timer_label != "Timer" else "")
        }
    
    @function_tool()
    async def clear_timers(
        self,
        context: RunContext,
    ) -> dict:
        """
        Clear all active timers. Use when the user wants to stop/clear all timers,
        or says something like "cancel the timer" or "never mind about the timer".
        """
        if self._room:
            timer_data = json.dumps({
                "type": "timer",
                "action": "clear_all"
            })
            await self._room.local_participant.publish_data(
                timer_data.encode('utf-8'),
                reliable=True,
            )
        
        return {
            "success": True,
            "message": "All timers cleared!"
        }
    
    @function_tool()
    async def add_to_shopping_list(
        self,
        context: RunContext,
        items: str,
    ) -> dict:
        """
        Add items to the user's shopping list. Use this when the user wants to remember
        ingredients they need to buy.
        
        For EACH item, you MUST provide: name|category|emoji|quantity
        - name: The ingredient name
        - category: One of: Dairy, Produce, Meat, Seafood, Bakery, Pantry, Frozen, Beverages, Spices, Other
        - emoji: A single emoji representing the item
        - quantity: Number needed (use 1 if not specified)
        
        Args:
            items: Pipe-separated item details, comma-separated for multiple items.
                   Format: "name|category|emoji|quantity, name|category|emoji|quantity"
                   Example: "eggs|Dairy|🥚|12, butter|Dairy|🧈|1, broccoli|Produce|🥦|2"
        """
        import time as time_module
        
        # Initialize shopping list if not exists
        if not hasattr(self, '_shopping_list'):
            self._shopping_list = []
        
        added = []
        for item_str in items.split(","):
            item_str = item_str.strip()
            if not item_str:
                continue
            
            parts = [p.strip() for p in item_str.split("|")]
            name = parts[0] if len(parts) > 0 else "Unknown"
            category = parts[1] if len(parts) > 1 else "Other"
            emoji = parts[2] if len(parts) > 2 else "🛒"
            try:
                quantity = int(parts[3]) if len(parts) > 3 else 1
            except ValueError:
                quantity = 1
            
            existing = next((i for i in self._shopping_list if i["name"].lower() == name.lower()), None)
            if existing:
                existing["quantity"] += quantity
            else:
                new_item = {
                    "id": f"item-{int(time_module.time() * 1000)}-{len(self._shopping_list)}",
                    "name": name,
                    "category": category,
                    "emoji": emoji,
                    "quantity": quantity
                }
                self._shopping_list.append(new_item)
                added.append(name)
        
        if self._room:
            list_data = json.dumps({
                "type": "shopping_list",
                "action": "update",
                "items": self._shopping_list
            })
            await self._room.local_participant.publish_data(
                list_data.encode('utf-8'),
                reliable=True,
            )
            print(f"Shopping list updated: {[i['name'] for i in self._shopping_list]}")
        
        if added:
            return {
                "success": True,
                "added": added,
                "total_items": len(self._shopping_list),
                "message": f"Added {', '.join(added)} to your shopping list!"
            }
        else:
            return {
                "success": True,
                "message": "Updated quantities for existing items!"
            }
    
    @function_tool()
    async def remove_from_shopping_list(
        self,
        context: RunContext,
        items: str,
    ) -> dict:
        """
        Remove specific items from the shopping list. Use when the user says they 
        already have an ingredient or don't need it anymore.
        
        Args:
            items: Comma-separated list of item names to remove (e.g., "eggs, butter")
        """
        if not hasattr(self, '_shopping_list'):
            self._shopping_list = []
        
        items_to_remove = [item.strip().lower() for item in items.split(",") if item.strip()]
        removed = []
        
        for item_name in items_to_remove:
            # Find and remove matching items (case-insensitive)
            for existing in self._shopping_list[:]:
                if existing["name"].lower() == item_name:
                    self._shopping_list.remove(existing)
                    removed.append(existing["name"])
                    break
        
        # Send updated list to frontend
        if self._room:
            list_data = json.dumps({
                "type": "shopping_list",
                "action": "update",
                "items": self._shopping_list
            })
            await self._room.local_participant.publish_data(
                list_data.encode('utf-8'),
                reliable=True,
            )
        
        if removed:
            return {
                "success": True,
                "removed": removed,
                "remaining": len(self._shopping_list),
                "message": f"Removed {', '.join(removed)} from your shopping list."
            }
        else:
            return {
                "success": False,
                "message": "Those items weren't on your list."
            }
    
    @function_tool()
    async def clear_shopping_list(
        self,
        context: RunContext,
    ) -> dict:
        """
        Clear all items from the shopping list. Use when the user wants to start fresh
        or says they're done with the list.
        """
        if hasattr(self, '_shopping_list'):
            self._shopping_list = []
        
        if self._room:
            list_data = json.dumps({
                "type": "shopping_list",
                "action": "clear",
                "items": []
            })
            await self._room.local_participant.publish_data(
                list_data.encode('utf-8'),
                reliable=True,
            )
        
        return {
            "success": True,
            "message": "Shopping list cleared!"
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
    
    voice_name = VOICE_OPTIONS.get(voice_preference, VOICE_OPTIONS[DEFAULT_VOICE])
    print(f"Using TTS voice: {voice_preference} ({voice_name})")
    
    # STT -> LLM -> TTS 
    session = AgentSession(
        stt=speechmatics.STT(
            language="en",
        ),
        llm=openai.LLM(
            model="gpt-5-mini",
        ),
        tts=deepgram.TTS(
            model=voice_name,
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    
    # agent with session and room reference now for data publishing
    agent = SousChefAgent(session=session, room=ctx.room)
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
        import asyncio
        print("Received reload_cookbook RPC call")
        
        await session.generate_reply(
            instructions="The user just uploaded a cookbook PDF. Acknowledge it immediately like 'Oh nice, I see you've uploaded a recipe! I'll go through it now - feel free to ask me anything in the meantime!' Keep it brief and friendly."
        )
        
        # Running the blocking indexing in a thread to not block the event loop so ai can still respond. ( Realtime wohoo)
        success, message = await asyncio.to_thread(reload_rag)
        
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
        success, message = await asyncio.to_thread(clear_rag)
        
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
        success, message = await asyncio.to_thread(clear_rag)
        return message
    
    await session.generate_reply(
        instructions="Greet the user warmly as SousChef, their personal cooking assistant. Keep it brief and friendly, and ask what they'd like help with today."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

