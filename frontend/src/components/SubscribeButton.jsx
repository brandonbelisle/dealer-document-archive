import { useState, useEffect } from "react";
import * as api from "../api";
import { BellIcon } from "./Icons";

export default function SubscribeButton({ type, itemId, subscriptions, onSubscribe, onUnsubscribe, t }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = subscriptions.find(
      (s) => s.subscription_type === type && s.subscription_id === itemId
    );
    setIsSubscribed(!!sub);
  }, [subscriptions, type, itemId]);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (isSubscribed) {
        const sub = subscriptions.find(
          (s) => s.subscription_type === type && s.subscription_id === itemId
        );
        if (sub) {
          await api.deleteSubscription(sub.id);
          onUnsubscribe(sub.id);
        }
      } else {
        const newSub = await api.createSubscription(type, itemId);
        onSubscribe(newSub);
      }
      setIsSubscribed(!isSubscribed);
    } catch (err) {
      console.error("Failed to update subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isSubscribed ? "Unsubscribe from notifications" : "Subscribe to notifications"}
      style={{
        background: isSubscribed ? t.accentSoft : "transparent",
        border: `1px solid ${isSubscribed ? t.accent : t.border}`,
        borderRadius: 6,
        padding: "4px 8px",
        cursor: loading ? "wait" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "inherit",
        color: isSubscribed ? t.accent : t.textMuted,
        opacity: loading ? 0.6 : 1,
        transition: "all 0.15s ease",
      }}
    >
      <BellIcon size={12} />
      {isSubscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}