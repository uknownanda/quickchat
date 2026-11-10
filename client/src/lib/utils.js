export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatLastSeen(date) {
  if (!date) return "Offline";

  const lastSeen = new Date(date);

  if (Number.isNaN(lastSeen.getTime())) return "Offline";

  const now = new Date();

  const time = lastSeen.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastSeenDate = new Date(
    lastSeen.getFullYear(),
    lastSeen.getMonth(),
    lastSeen.getDate(),
  );

  if (lastSeenDate.getTime() === today.getTime()) {
    return `Today at ${time}`;
  }

  if (lastSeenDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${time}`;
  }

  return `${lastSeen.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} at ${time}`;
}
