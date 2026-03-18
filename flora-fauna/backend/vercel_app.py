"""
Vercel Serverless Entry Point - Optimized for Cold Starts

This module provides a cached app instance to reduce cold start times
on subsequent invocations within the same Lambda container.
"""
import os

# Module-level app cache for warm starts
_cached_app = None


def get_app():
    """
    Get or create the Flask app with caching for warm starts.
    
    The app is cached at the module level so subsequent invocations
    within the same Lambda container reuse the existing instance,
    avoiding expensive re-initialization.
    """
    global _cached_app
    
    if _cached_app is not None:
        return _cached_app
    
    # Set environment hints for optimized initialization
    os.environ.setdefault('VERCEL', '1')
    os.environ.setdefault('SERVERLESS', '1')
    
    # Import and create app (lazy import reduces initial parse time)
    from backend_factory import load_create_app
    create_app = load_create_app()
    _cached_app = create_app()
    
    return _cached_app


# Create app at module load time (during cold start)
# This ensures the app is ready before the first request
app = get_app()
