function toPublicItem(item) {
  return {
    id: item._id.toString(),
    kind: item.kind,
    title: item.title,
    description: item.description,
    category: item.category,
    location: item.location,
    occurredAt: item.occurredAt.toISOString(),
    imageUrl: item.imageUrl ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

module.exports = { toPublicItem };
