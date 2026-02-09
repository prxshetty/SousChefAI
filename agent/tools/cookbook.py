from livekit.agents import RunContext, function_tool
import sys
import os

# Ensure we can import from parent directory if needed, or rely on pythonpath
try:
    from rag import reload_rag
except ImportError:
    # If running as a package, might need relative, but for now try absolute considering main.py context
    from ..rag import reload_rag

class CookbookMixin:
    @function_tool()
    async def reload_cookbook(
        self,
        context: RunContext,
    ) -> dict:
        """
        Reload the cookbook after a new PDF has been uploaded.
        Call this when the user mentions they've uploaded a new document.
        """
        if hasattr(self, 'rag') and self.rag:
            success, message = self.rag.reload_index()
        else:
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
        # Assumes self.rag is available on the main instance
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
