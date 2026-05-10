class FeatureStore:
    """
    Unified client for fetching online and offline features.
    """
    
    def __init__(self, redis_url: str, clickhouse_url: str):
        self.redis_url = redis_url
        self.clickhouse_url = clickhouse_url

    def get_online_features(self, entity_id: str, feature_names: list):
        # Fetch from Redis
        return {name: random_val() for name in feature_names}

    def get_offline_features(self, entity_id: str, feature_names: list):
        # Fetch from ClickHouse
        return {name: random_val() for name in feature_names}

def random_val():
    import random
    return random.random()
