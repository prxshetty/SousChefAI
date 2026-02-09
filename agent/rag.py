import os
from pathlib import Path
from typing import Optional

from pinecone import Pinecone, ServerlessSpec
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Settings,
    StorageContext,
)
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.pinecone import PineconeVectorStore

Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

# Paths
DATA_DIR = Path(__file__).parent / "data"

# Pinecone config
PINECONE_INDEX_NAME = "souschef-cookbook"
PINECONE_DIMENSION = 1536  # text-embedding-3-small dimension


class CookbookRAG:
    def __init__(self):
        self.index: Optional[VectorStoreIndex] = None
        self.pinecone_index = None
        self._init_pinecone()
        self._load_or_create_index()
    
    def _init_pinecone(self) -> None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            print("WARNING: PINECONE_API_KEY not set. RAG will not be available.")
            return
        
        try:
            pc = Pinecone(api_key=api_key)
            
            # Create index if it doesn't exist
            existing_indexes = pc.list_indexes().names()
            if PINECONE_INDEX_NAME not in existing_indexes:
                print(f"Creating Pinecone index: {PINECONE_INDEX_NAME}")
                pc.create_index(
                    name=PINECONE_INDEX_NAME,
                    dimension=PINECONE_DIMENSION,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
            
            self.pinecone_index = pc.Index(PINECONE_INDEX_NAME)
            print(f"Connected to Pinecone index: {PINECONE_INDEX_NAME}")
        except Exception as e:
            print(f"Failed to initialize Pinecone: {e}")
            self.pinecone_index = None
    
    def _load_or_create_index(self) -> None:
        """Load existing index from Pinecone or create new one from PDFs."""
        if not self.pinecone_index:
            print("Pinecone not available. RAG disabled.")
            return
        
        try:
            # Create vector store connected to Pinecone
            vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
            
            # Check if index has vectors
            stats = self.pinecone_index.describe_index_stats()
            if stats.total_vector_count > 0:
                # Load existing index
                self.index = VectorStoreIndex.from_vector_store(vector_store)
                print(f"Loaded existing index with {stats.total_vector_count} vectors")
            elif DATA_DIR.exists() and any(DATA_DIR.iterdir()):
                # Create new index from documents
                self._create_index(vector_store)
            else:
                print(f"No documents found in {DATA_DIR}. RAG will not be available.")
                print("Please add PDF files to the data/ directory.")
        except Exception as e:
            print(f"Error loading/creating index: {e}")
            self.index = None
    
    def _create_index(self, vector_store: Optional[PineconeVectorStore] = None) -> None:
        """Create a new index from PDF documents."""
        if not self.pinecone_index:
            print("Pinecone not available. Cannot create index.")
            return
            
        print(f"Creating index from documents in {DATA_DIR}...")
        
        if not DATA_DIR.exists() or not any(DATA_DIR.iterdir()):
            print("No documents to index.")
            return
        
        documents = SimpleDirectoryReader(
            input_dir=str(DATA_DIR),
            recursive=True,
            required_exts=[".pdf", ".txt", ".md"],
        ).load_data()
        
        if not documents:
            print("No documents found to index.")
            return
        
        print(f"Loaded {len(documents)} document chunks")
        
        if vector_store is None:
            vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        
        self.index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
        )
        print(f"Index created and uploaded to Pinecone")
    
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
        """Get the number of vectors in the index."""
        if not self.pinecone_index:
            return 0
        try:
            stats = self.pinecone_index.describe_index_stats()
            return stats.total_vector_count
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
            if not self.pinecone_index:
                return False, "Pinecone not available."
            
            if not DATA_DIR.exists() or not any(DATA_DIR.iterdir()):
                return False, "No documents found in the data directory."
             
            print("Clearing existing vectors...")
            self.pinecone_index.delete(delete_all=True)
            self._create_index()
            
            if self.index is not None:
                pdf_count = len(list(DATA_DIR.glob("**/*.pdf")))
                txt_count = len(list(DATA_DIR.glob("**/*.txt")))
                doc_count = pdf_count + txt_count
                stats = self.pinecone_index.describe_index_stats()
                return True, f"Successfully indexed {doc_count} document(s) ({pdf_count} PDFs, {txt_count} recipe images) with {stats.total_vector_count} vectors. I'm ready to answer questions!"
            else:
                return False, "Failed to create index."
        except Exception as e:
            return False, f"Error reloading index: {str(e)}"
    
    def clear_index(self) -> tuple[bool, str]:
        """
        Clear all vectors from the Pinecone index.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            if not self.pinecone_index:
                return False, "Pinecone not available."
            
            print("Clearing all vectors from index...")
            self.pinecone_index.delete(delete_all=True)
            self.index = None
            
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
