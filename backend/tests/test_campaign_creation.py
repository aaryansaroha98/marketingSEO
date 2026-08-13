import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import ai, models, schemas
from app.db import Base
from app.main import create_campaign


class CampaignCreationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add(models.BrandProfile(
            startup_name="Quantify Terminal",
            audience="Professional traders and investors " * 30,
            offer="Free market intelligence for everyone",
        ))
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_long_profile_creates_all_channel_drafts(self) -> None:
        payload = schemas.CampaignInput(
            name="Production launch",
            objective="Generate qualified demand",
            channels=["linkedin", "x", "instagram", "reddit"],
        )
        with patch.object(ai, "_complete_json", AsyncMock(side_effect=RuntimeError("offline"))):
            campaign = asyncio.run(create_campaign(payload, self.db))

        drafts = list(self.db.scalars(select(models.ContentItem)))
        self.assertEqual(campaign.strategy["generated_by"], "rules")
        self.assertEqual(len(drafts), 4)
        self.assertTrue(all(0 < len(draft.title) <= 300 for draft in drafts))
        self.assertLessEqual(len(next(d.body for d in drafts if d.platform == "x")), 280)


if __name__ == "__main__":
    unittest.main()
