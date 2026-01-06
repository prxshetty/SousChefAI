import json
import time as time_module
from livekit.agents import RunContext, function_tool

class ShoppingListMixin:
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
