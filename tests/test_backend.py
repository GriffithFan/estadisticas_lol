import pytest
from fastapi.testclient import TestClient

from backend import main
from backend.services.ddragon import DataDragonService


client = TestClient(main.app)


def test_recommendations_endpoint_returns_payload(monkeypatch):
    """El endpoint de recomendaciones debe generar datos cuando hay historial disponible"""

    async def mock_get_match_ids(puuid, routing, start, count):
        assert puuid == "test-puuid"
        assert routing == "americas"
        return {"success": True, "data": ["MATCH-1"]}

    async def mock_fetch_match_details(match_ids, routing, concurrency=5):
        assert match_ids == ["MATCH-1"]
        return [{
            "metadata": {"matchId": "MATCH-1"},
            "info": {
                "gameDuration": 1800,
                "participants": [{
                    "puuid": "test-puuid",
                    "win": True,
                    "championName": "Ahri",
                    "teamPosition": "MID",
                    "lane": "MID",
                    "kills": 10,
                    "deaths": 2,
                    "assists": 8,
                    "totalMinionsKilled": 200,
                    "neutralMinionsKilled": 12,
                    "visionScore": 25,
                    "totalDamageDealtToChampions": 25000,
                    "goldEarned": 15000,
                    "item0": 6655,
                    "item1": 3020,
                    "item2": 1058,
                    "item3": 3100,
                    "item4": 3165,
                    "item5": 4629,
                    "item6": 3364
                }]
            }
        }]

    monkeypatch.setattr(main.riot_client, "get_match_ids_by_puuid", mock_get_match_ids)
    monkeypatch.setattr(main, "fetch_match_details", mock_fetch_match_details)

    response = client.get("/api/recommendations/test-puuid?region=la1")
    assert response.status_code == 200
    payload = response.json()
    recommendations = payload.get("recommendations")
    assert recommendations
    assert recommendations.get("strengths")


def test_player_live_endpoint_looks_up_summoner_id(monkeypatch):
    """El endpoint de live debe convertir PUUID a Summoner ID antes de consultar spectator"""
    calls = {}

    async def mock_get_summoner_by_puuid(puuid, region):
        calls["puuid"] = puuid
        return {"success": True, "data": {"id": "SUM-ID-123"}}

    async def mock_get_current_game(summoner_id, region):
        calls["summoner_id"] = summoner_id
        return {
            "success": True,
            "data": {
                "participants": [{"championId": 266, "teamId": 100}],
                "gameId": 1
            }
        }

    async def mock_get_champion_by_id(champion_id, lang="es_ES"):
        return {"id": "Aatrox", "name": "Aatrox"}

    async def mock_get_latest_version():
        return "15.25.1"

    monkeypatch.setattr(main.riot_client, "get_summoner_by_puuid", mock_get_summoner_by_puuid)
    monkeypatch.setattr(main.riot_client, "get_current_game", mock_get_current_game)
    monkeypatch.setattr(main.ddragon, "get_champion_by_id", mock_get_champion_by_id)
    monkeypatch.setattr(main.ddragon, "get_latest_version", mock_get_latest_version)

    response = client.get("/api/player/test-puuid/live?region=la2")
    assert response.status_code == 200
    body = response.json()
    assert body["in_game"] is True
    assert calls["summoner_id"] == "SUM-ID-123"


def test_ddragon_helpers_use_cached_version():
    service = DataDragonService()
    service._version = "99.9"
    icon_url = service.get_profile_icon_url(1234)
    assert "99.9" in icon_url
    item_url = service.get_item_image_url(1001)
    assert "99.9" in item_url


@pytest.mark.asyncio
async def test_fetch_match_details_preserves_input_order(monkeypatch):
    match_ids = ["A", "B", "C"]

    async def mock_get_match(match_id, routing):
        return {"success": True, "data": {"metadata": {"matchId": match_id}}}

    monkeypatch.setattr(main.riot_client, "get_match_by_id", mock_get_match)

    results = await main.fetch_match_details(match_ids, routing="americas", concurrency=2)
    returned_ids = [match["metadata"]["matchId"] for match in results]
    assert returned_ids == match_ids


@pytest.mark.asyncio
async def test_fetch_match_details_retries_on_rate_limit(monkeypatch):
    attempts = {"A": 0}

    async def mock_get_match(match_id, routing):
        attempts[match_id] = attempts.get(match_id, 0) + 1
        if attempts[match_id] == 1:
            return {"success": False, "status_code": 429}
        return {"success": True, "data": {"metadata": {"matchId": match_id}}}

    async def fast_sleep(_):  # evitar demoras reales
        return None

    monkeypatch.setattr(main.riot_client, "get_match_by_id", mock_get_match)
    monkeypatch.setattr(main.asyncio, "sleep", fast_sleep)

    results = await main.fetch_match_details(["A"], routing="americas", concurrency=1)
    assert attempts["A"] == 2  # hubo reintento
    assert results and results[0]["metadata"]["matchId"] == "A"
