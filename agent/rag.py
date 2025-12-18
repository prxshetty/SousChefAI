"""
RAG module for SousChef AI using LlamaIndex.
Provides semantic search over cooking PDFs.
"""

import os
from pathlib import Path
from typing import Optional

from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Settings,
    StorageContext,
    load_index_from_storage,
)
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
# TODO: only a semantic retriever is used, query engine not used

# Paths
DATA_DIR = Path(__file__).parent / "data"
STORAGE_DIR = Path(__file__).parent / "storage"


class CookbookRAG:
    """RAG system for querying cooking documents."""
    
    def __init__(self):
        self.index: Optional[VectorStoreIndex] = None
        self._load_or_create_index()
    
    def _load_or_create_index(self) -> None:
        """Load existing index or create new one from PDFs."""
        if STORAGE_DIR.exists():
            try:
                storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
                self.index = load_index_from_storage(storage_context)
                print("Loaded existing index from storage")
                return
            except Exception as e:
                print(f"Could not load existing index: {e}")

        if DATA_DIR.exists() and any(DATA_DIR.iterdir()):
            self._create_index()
        else:
            print(f"No documents found in {DATA_DIR}. RAG will not be available.")
            print("Please add PDF files to the data/ directory and restart.")
    
    def _create_index(self) -> None:
        """Create a new index from PDF documents."""
        print(f"Creating index from documents in {DATA_DIR}...")
        
        documents = SimpleDirectoryReader(
            input_dir=str(DATA_DIR),
            recursive=True,
            required_exts=[".pdf", ".txt", ".md"],
        ).load_data()
        
        if not documents:
            print("No documents found to index.")
            return
        
        print(f"Loaded {len(documents)} document chunks")
        
        self.index = VectorStoreIndex.from_documents(documents)
        
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.index.storage_context.persist(persist_dir=str(STORAGE_DIR))
        print(f"Index saved to {STORAGE_DIR}")
    
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
            
            if STORAGE_DIR.exists():
                import shutil
                shutil.rmtree(STORAGE_DIR)
            
            self._create_index()
            
            if self.index is not None:
                doc_count = len(list(DATA_DIR.glob("**/*.pdf")))
                return True, f"Successfully indexed {doc_count} PDF(s). I'm ready to answer questions!"
            else:
                return False, "Failed to create index."
        except Exception as e:
            return False, f"Error reloading index: {str(e)}"

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
