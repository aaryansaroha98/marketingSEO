import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from app import ai, integrations
from app.config import Settings


class AiSettingsTests(unittest.TestCase):
    def test_provider_labels(self) -> None:
        self.assertEqual(ai.provider_label("https://api.openai.com/v1"), "OpenAI")
        self.assertEqual(ai.provider_label("https://api.groq.com/openai/v1"), "Groq")
        self.assertEqual(ai.provider_label("https://openrouter.ai/api/v1"), "OpenRouter")
        self.assertEqual(ai.provider_label("https://generativelanguage.googleapis.com/v1beta/openai"), "Google Gemini")

    def test_connection_requires_valid_structured_acknowledgement(self) -> None:
        with patch.object(ai, "_complete_json", AsyncMock(return_value={"status": "ok"})):
            asyncio.run(ai.test_connection())
        with patch.object(ai, "_complete_json", AsyncMock(return_value={"status": "wrong"})):
            with self.assertRaises(ValueError):
                asyncio.run(ai.test_connection())

    def test_social_configuration_requires_exchange_secrets(self) -> None:
        partial = Settings(linkedin_client_id="id", meta_client_id="id", reddit_client_id="id")
        self.assertFalse(integrations.configured("linkedin", partial))
        self.assertFalse(integrations.configured("instagram", partial))
        self.assertFalse(integrations.configured("reddit", partial))
        complete = Settings(linkedin_client_id="id", linkedin_client_secret="secret")
        self.assertTrue(integrations.configured("linkedin", complete))


if __name__ == "__main__":
    unittest.main()
