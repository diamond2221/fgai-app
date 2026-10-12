"""An address entry is not proof that an actor's runtime can serve requests."""
def runtime_needs_preparation(state, image_id=None):
    if not state or not state.get('State', {}).get('Running'):
        return True
    health = state.get('State', {}).get('Health', {}).get('Status')
    if health == 'unhealthy':
        return True
    return image_id is not None and state.get('Image') != image_id
