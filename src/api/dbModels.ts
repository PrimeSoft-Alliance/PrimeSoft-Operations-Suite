import mongoose from 'mongoose';

const knowledgeChunkSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  sourceType: { type: String, enum: ['document', 'manual'], default: 'manual' },
  content: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  vector: [{ type: Number }],
  externalId: { type: String }, // Document ID from source
}, { timestamps: true });

knowledgeChunkSchema.index({ clientId: 1, externalId: 1 }, { unique: true });

export const KnowledgeChunk = mongoose.models.KnowledgeChunk || mongoose.model<any>('KnowledgeChunk', knowledgeChunkSchema);
