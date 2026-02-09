import os
from pathlib import Path
from typing import Optional, List

from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Settings,
)

from llama_index.core.embeddings import BaseEmbedding
from google import genai
from google.genai import types

class GeminiEmbedding(BaseEmbedding):
    """Custom Embedding class using the new Google GenAI SDK."""
    
    _client: genai.Client = None
    _model_name: str = "models/gemini-embedding-001"

    def __init__(self, model_name: str = "models/gemini-embedding-001", api_key: Optional[str] = None, **kwargs):
        super().__init__(model_name=model_name, **kwargs)
        self._model_name = model_name
        # use provided api_key or fall back to env var
        if not api_key:
            api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             # fallback to GOOGLE_API_KEY
             api_key = os.getenv("GOOGLE_API_KEY")
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required.")

        self._client = genai.Client(api_key=api_key)

    def _get_query_embedding(self, query: str) -> List[float]:
        try:
            response = self._client.models.embed_content(
                model=self._model_name,
                contents=query,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY"
                )
            )
            return response.embeddings[0].values
        except Exception as e:
            print(f"Error getting query embedding: {e}")
            return []

    async def _aget_query_embedding(self, query: str) -> List[float]:
        return self._get_query_embedding(query)

    def _get_text_embedding(self, text: str) -> List[float]:
        try:
            response = self._client.models.embed_content(
                model=self._model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT"
                )
            )
            return response.embeddings[0].values
        except Exception as e:
             print(f"Error getting text embedding: {e}")
             return []

    async def _aget_text_embedding(self, text: str) -> List[float]:
        return self._get_text_embedding(text)


Settings.embed_model = GeminiEmbedding(model_name="models/gemini-embedding-001")

# Paths
DATA_DIR = Path(__file__).parent / "data"


class CookbookRAG:
    """In-memory RAG for cookbook documents. No external vector DB required."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.index: Optional[VectorStoreIndex] = None
        self.recipe_gallery: List[dict] = []  # Cached gallery items
        self._gallery_cache_key: str = ""    # To detect file changes
        self._load_documents_on_startup()
    
    def _load_documents_on_startup(self) -> None:
        """Check for documents in data/ and build index if found."""
        if not DATA_DIR.exists():
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            print(f"Created data directory: {DATA_DIR}")
            return
        
        if not any(DATA_DIR.iterdir()):
            print(f"No documents found in {DATA_DIR}. Waiting for uploads.")
            return
        pass
    
    def _build_index(self) -> None:
        """Build a fresh in-memory index from documents."""
        if not DATA_DIR.exists() or not any(DATA_DIR.iterdir()):
            print("No documents to index.")
            return
        
        print(f"Building in-memory index from {DATA_DIR}...")
        
        try:
            documents = SimpleDirectoryReader(
                input_dir=str(DATA_DIR),
                recursive=True,
                required_exts=[".pdf", ".txt", ".md"],
            ).load_data()
            
            if not documents:
                print("No documents found to index.")
                return
            
            print(f"Loaded {len(documents)} document chunks")
            embed_model = GeminiEmbedding(api_key=self.api_key) if self.api_key else Settings.embed_model
            self.index = VectorStoreIndex.from_documents(documents, embed_model=embed_model)
            print(f"In-memory index created successfully!")
            
        except Exception as e:
            print(f"Error building index: {e}")
            self.index = None
    
    def query(self, question: str, top_k: int = 3) -> str:
        """
        Query the cookbook knowledge base.
        
        Args:
            question: The question to ask
            top_k: Number of relevant chunks to retrieve
            
        Returns:
            Retrieved context relevant to the question
        """
        if self.index is None:
            return "I don't have access to any cookbook documents right now. Please upload a cooking PDF first."
        
        retriever = self.index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(question)
        
        if not nodes:
            return "I couldn't find any relevant information about that in my cookbook."
        
        context_parts = []
        for i, node in enumerate(nodes, 1):
            context_parts.append(f"[Source {i}]: {node.text}")
        
        return "\n\n".join(context_parts)
    
    def is_available(self) -> bool:
        """Check if RAG is ready to use."""
        return self.index is not None
    
    def get_vector_count(self) -> int:
        """Get approximate document count (in-memory doesn't track vectors directly)."""
        if self.index is None:
            return 0
        try:
            # For in-memory, we can check if there are any nodes
            return len(list(DATA_DIR.glob("**/*.pdf"))) + len(list(DATA_DIR.glob("**/*.txt")))
        except:
            return 0
    
    def reload_index(self) -> tuple[bool, str]:
        """
        Rebuild the index from documents in the data directory.
        Called when new PDFs are uploaded.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            if not DATA_DIR.exists() or not any(DATA_DIR.iterdir()):
                return False, "No documents found in the data directory."
            
            # Clear existing index
            self.index = None
            
            # Rebuild
            self._build_index()
            
            # Clear gallery cache too on reload
            self.recipe_gallery = []
            self._gallery_cache_key = ""
            
            if self.index is not None:
                pdf_count = len(list(DATA_DIR.glob("**/*.pdf")))
                txt_count = len(list(DATA_DIR.glob("**/*.txt")))
                doc_count = pdf_count + txt_count
                return True, f"Successfully indexed {doc_count} document(s) ({pdf_count} PDFs, {txt_count} text files). I'm ready to answer questions!"
            else:
                return False, "Failed to create index."
        except Exception as e:
            return False, f"Error reloading index: {str(e)}"
    
    def clear_index(self) -> tuple[bool, str]:
        """
        Clear the in-memory index.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            self.index = None
            self.recipe_gallery = []
            self._gallery_cache_key = ""
            
            return True, "Cookbook cleared! I've forgotten everything from the uploaded recipes."
        except Exception as e:
            return False, f"Error clearing index: {str(e)}"


_rag_instance: Optional[CookbookRAG] = None

def get_rag() -> CookbookRAG:
    """Get or create the global RAG instance."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = CookbookRAG()
    return _rag_instance


def reload_rag() -> tuple[bool, str]:
    """Reload the RAG index. Returns (success, message)."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = CookbookRAG()
        return _rag_instance.is_available(), "RAG initialized."
    return _rag_instance.reload_index()


def clear_rag() -> tuple[bool, str]:
    """Clear the RAG index. Returns (success, message)."""
    global _rag_instance
    if _rag_instance is None:
        return False, "No cookbook loaded."
    return _rag_instance.clear_index()
