export function managedTextDefault(document,catalog,initialized) {
  const saved=document.creatorServices?.llm?.model;
  return initialized&&catalog.models.some(model=>model.id===saved)?saved:'gpt-6.1-sol';
}
