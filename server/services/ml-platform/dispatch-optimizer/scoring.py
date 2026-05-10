import math

def calculate_dispatch_score(rider, order):
    """
    Calculates a score for assigning a rider to an order.
    Higher score = Better assignment.
    """
    
    # 1. Distance Score (Haversine distance)
    distance = haversine(
        rider['lat'], rider['lng'], 
        order['restaurant_lat'], order['restaurant_lng']
    )
    # Inverse relationship: closer is better
    distance_score = 1.0 / (1.0 + distance)
    
    # 2. Rating Score
    rating_score = rider['rating'] / 5.0
    
    # 3. Utilization Bonus (If rider has been idle, give a small boost)
    idle_time_bonus = min(rider['idle_minutes'] / 60.0, 0.2)
    
    # Weighted Final Score
    total_score = (distance_score * 0.6) + (rating_score * 0.3) + idle_time_bonus
    
    return round(total_score, 4)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c
