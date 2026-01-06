import json
import time as time_module
from livekit.agents import RunContext, function_tool

class TimerMixin:
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
