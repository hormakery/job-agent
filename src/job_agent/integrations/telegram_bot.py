import httpx
from job_agent.config import settings
from job_agent.models.schemas import CalendarSlot


class TelegramHitlNotifier:
    """
    Sends Human-in-the-Loop alerts with inline slot buttons to Telegram when configured,
    in tandem with the Next.js Web UI Interview Coordinator Hub.
    """

    def is_configured(self) -> bool:
        return bool(
            settings.telegram_bot_token
            and settings.telegram_bot_token != "your_telegram_bot_token_here"
            and settings.telegram_chat_id
            and settings.telegram_chat_id != "your_telegram_chat_id_here"
        )

    def send_slot_selection_alert(
        self, company_name: str, role_title: str, slots: list[CalendarSlot], job_id: str
    ) -> bool:
        if not self.is_configured():
            return False

        text = (
            f"🎯 *{company_name}* wants to schedule an interview for *{role_title}*!\n\n"
            "Your available Google Calendar slots:\n"
            + "\n".join(f"• {s.label}" for s in slots)
            + "\n\nWhich slot would you like to confirm?"
        )
        inline_keyboard = [
            [{"text": s.label, "callback_data": f"book:{job_id}:{s.slot_id}"}] for s in slots
        ]
        try:
            url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    url,
                    json={
                        "chat_id": settings.telegram_chat_id,
                        "text": text,
                        "parse_mode": "Markdown",
                        "reply_markup": {"inline_keyboard": inline_keyboard},
                    },
                )
                return resp.status_code == 200
        except Exception:
            return False

