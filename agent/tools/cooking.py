import json
from livekit.agents import RunContext, function_tool
from recipe_parser import parse_recipe_from_rag, RecipePlan

class CookingMixin:
    # State to track current cooking session
    current_recipe: RecipePlan | None = None
    cooking_mode_active: bool = False

    @function_tool()
    async def generate_recipe_plan(
        self,
        context: RunContext,
        recipe_query: str,
    ) -> dict:
        """
        Refined search and planning tool. Use this when the user wants to cook a specific 
        recipe from their cookbook and is ready to start.
        
        Steps:
        1. Searches the cookbook RAG for the recipe.
        2. Generates a structured step-by-step plan.
        3. Presents it to the user for confirmation.
        
        Args:
            recipe_query: The name of the recipe to cook (e.g., "Eggs Benedict", "Lasagna")
        """
        # 1. Check RAG availability
        if not self.rag.is_available():
            return {
                "success": False,
                "message": "Please upload a cookbook first!"
            }

        # 2. Search RAG
        # We fetch a bit more context for full recipe extraction
        rag_content = self.rag.query(recipe_query, top_k=5)
        
        if "couldn't find" in rag_content.lower() and len(rag_content) < 100:
            return {
                "success": False,
                "found": False,
                "message": f"I couldn't find a recipe for {recipe_query} in your cookbook."
            }
        
        # 3. Parse with Gemini
        print(f"Parsing recipe for '{recipe_query}'...")
        plan = await parse_recipe_from_rag(rag_content, recipe_query)
        
        if not plan:
            return {
                "success": False,
                "message": "I found some info, but I couldn't extract a clear recipe structure from it."
            }
        
        # 4. Store state
        self.current_recipe = plan
        
        # 5. Push to frontend
        if self._room:
            # Send the plan to the UI
            payload = json.dumps({
                "type": "recipe_plan",
                "plan": plan.to_dict()
            })
            await self._room.local_participant.publish_data(
                payload.encode('utf-8'),
                reliable=True
            )
        
        return {
            "success": True,
            "found": True,
            "recipe_name": plan.name,
            "steps_count": len(plan.steps),
            "message": f"I've found the recipe for {plan.name}. It has {len(plan.steps)} steps. Shall we start cooking?"
        }

    @function_tool()
    async def start_cooking_mode(
        self,
        context: RunContext,
    ) -> dict:
        """
        Start the interactive cooking mode. Call this ONLY after 'generate_recipe_plan' 
        has been called and the user confirms they want to start (e.g. "Yes, let's cook").
        """
        if not self.current_recipe:
            return {
                "success": False,
                "message": "We check a recipe first. What do you want to cook?"
            }
        
        self.cooking_mode_active = True
        
        if self._room:
            payload = json.dumps({
                "type": "cooking_mode",
                "action": "start"
            })
            await self._room.local_participant.publish_data(
                payload.encode('utf-8'),
                reliable=True
            )
            
        first_step = self.current_recipe.steps[0]
        
        return {
            "success": True,
            "mode": "cooking",
            "first_step": first_step.instruction,
            "message": f"Great! Let's get started. Step 1: {first_step.instruction}"
        }

    @function_tool()
    async def next_step(
        self,
        context: RunContext,
    ) -> dict:
        """
        Move to the next step in the recipe. Use when user says "next", "done", 
        "continue", or "what's next".
        """
        if not self.current_recipe or not self.cooking_mode_active:
            return {"success": False, "message": "We're not in cooking mode yet."}
        
        # Mark current complete
        current_idx = self.current_recipe.current_step_index
        if current_idx < len(self.current_recipe.steps):
            self.current_recipe.steps[current_idx].completed = True
        
        # Advance
        next_idx = current_idx + 1
        
        if next_idx >= len(self.current_recipe.steps):
            # Recipe complete!
            if self._room:
                 payload = json.dumps({
                    "type": "cooking_mode",
                    "action": "complete"
                })
                 await self._room.local_participant.publish_data(payload.encode('utf-8'), reliable=True)

            return {
                "success": True,
                "complete": True,
                "message": "That was the last step! Enjoy your meal!"
            }
        
        self.current_recipe.current_step_index = next_idx
        next_step_obj = self.current_recipe.steps[next_idx]
        
        # Update UI
        if self._room:
            payload = json.dumps({
                "type": "step_update",
                "step_index": next_idx
            })
            await self._room.local_participant.publish_data(
                payload.encode('utf-8'),
                reliable=True
            )
            
        return {
            "success": True,
            "step_number": next_step_obj.step_number,
            "instruction": next_step_obj.instruction,
            "tips": next_step_obj.tips,
            "message": f"Step {next_step_obj.step_number}: {next_step_obj.instruction}"
        }

    @function_tool()
    async def previous_step(
        self,
        context: RunContext,
    ) -> dict:
        """
        Go back to the previous step. Use when user says "go back", "previous step", etc.
        """
        if not self.current_recipe or not self.cooking_mode_active:
            return {"success": False, "message": "We're not in cooking mode yet."}
        
        current_idx = self.current_recipe.current_step_index
        if current_idx > 0:
            self.current_recipe.current_step_index -= 1
            prev_idx = self.current_recipe.current_step_index
            prev_step_obj = self.current_recipe.steps[prev_idx]
            
            # Update UI
            if self._room:
                payload = json.dumps({
                    "type": "step_update",
                    "step_index": prev_idx
                })
                await self._room.local_participant.publish_data(
                    payload.encode('utf-8'),
                    reliable=True
                )
            
            return {
               "success": True,
               "step_number": prev_step_obj.step_number,
               "instruction": prev_step_obj.instruction,
               "message": f"Back to Step {prev_step_obj.step_number}: {prev_step_obj.instruction}"
            }
        else:
             return {
               "success": False,
               "message": "We're already at the first step."
            }
