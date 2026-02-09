import os
import asyncio
from dataclasses import dataclass
from typing import List, Optional
from pydantic import BaseModel, Field


# Pydantic models for Gemini structured output
class IngredientSchema(BaseModel):
    name: str = Field(description="Clean name of the ingredient")
    quantity: str = Field(description="Quantity and unit (e.g., '2', '500g', '1/2 cup')")
    emoji: str = Field(description="A single relevant emoji for this ingredient")


class RecipeStepSchema(BaseModel):
    step_number: int = Field(description="Step number in sequence")
    instruction: str = Field(description="The cooking instruction for this step")
    duration_minutes: Optional[int] = Field(default=None, description="Time in minutes if applicable")
    tips: Optional[str] = Field(default=None, description="Helpful tips for this step")


class RecipePlanSchema(BaseModel):
    name: str = Field(description="Name of the recipe")
    servings: str = Field(description="Number of servings (e.g., '4 servings')")
    prep_time: str = Field(description="Preparation time (e.g., '15 mins')")
    cook_time: str = Field(description="Cooking time (e.g., '30 mins')")
    ingredients: List[IngredientSchema] = Field(description="List of structured ingredients")
    steps: List[RecipeStepSchema] = Field(description="Step-by-step cooking instructions")


@dataclass
class Ingredient:
    name: str
    quantity: str
    emoji: str


# Dataclasses for internal use (with completed tracking)
@dataclass
class RecipeStep:
    step_number: int
    instruction: str
    duration_minutes: Optional[int] = None
    tips: Optional[str] = None
    completed: bool = False


@dataclass
class RecipePlan:
    name: str
    servings: str
    prep_time: str
    cook_time: str
    ingredients: List[Ingredient]
    steps: List[RecipeStep]
    current_step_index: int = 0
    
    def to_dict(self):
        import uuid
        return {
            "id": str(uuid.uuid4()),  # Generate unique ID for frontend
            "title": self.name,  # Frontend expects 'title', not 'name'
            "name": self.name,  # Keep for backwards compatibility
            "servings": self.servings,
            "prep_time": self.prep_time,
            "cook_time": self.cook_time,
            "ingredients": [
                {
                    "name": i.name,
                    "quantity": i.quantity,
                    "emoji": i.emoji
                }
                for i in self.ingredients
            ],
            "steps": [
                {
                    "step_number": s.step_number,
                    "instruction": s.instruction,
                    "duration_minutes": s.duration_minutes,
                    "tips": s.tips,
                    "completed": s.completed
                }
                for s in self.steps
            ],
            "current_step_index": self.current_step_index
        }


async def parse_recipe_from_rag(rag_content: str, recipe_query: str) -> Optional[RecipePlan]:
    """
    Parse raw RAG content into a structured RecipePlan using Gemini with native structured output.
    """
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("Error: GOOGLE_API_KEY not found for recipe parsing.")
        return None

    try:
        from google import genai
        
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
Extract the recipe from the following cookbook content.

User wants to make: {recipe_query}

Cookbook content:
{rag_content}

Strict Guidelines for Extraction:
1. Ingredients: Extract EACH actual ingredient with its exact quantity and unit. 
   - Clean up noisy text.
   - Assign a relevant emoji to each ingredient. 
2. Steps: Extract clear, sequential cooking instructions.
3. Estimations: Estimate prep_time and cook_time if not explicitly stated.

Extract the recipe with all ingredients and step-by-step instructions.
"""
        
        # Use asyncio.to_thread for the synchronous Gemini call
        response = await asyncio.to_thread(
            lambda: client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": RecipePlanSchema,
                },
            )
        )
        
        # Parse with Pydantic
        parsed = RecipePlanSchema.model_validate_json(response.text)
        
        # Convert to internal dataclass format
        ingredients = [
            Ingredient(
                name=i.name,
                quantity=i.quantity,
                emoji=i.emoji
            )
            for i in parsed.ingredients
        ]
        
        steps = [
            RecipeStep(
                step_number=s.step_number,
                instruction=s.instruction,
                duration_minutes=s.duration_minutes,
                tips=s.tips
            )
            for s in parsed.steps
        ]
        
        return RecipePlan(
            name=parsed.name,
            servings=parsed.servings,
            prep_time=parsed.prep_time,
            cook_time=parsed.cook_time,
            ingredients=ingredients,
            steps=steps
        )
        
    except Exception as e:
        print(f"Error parsing recipe: {e}")
        import traceback
        traceback.print_exc()
        return None
