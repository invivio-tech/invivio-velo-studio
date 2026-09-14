export interface Message {
  id: string;
  role: 'user' | 'ai' | 'human';
  content: string;
  timestamp: any; // Firebase Timestamp
  mediaUrl?: string;       // URL de download da mídia (Meta CDN ou proxy)
  mediaType?: 'audio' | 'image' | 'video' | 'document' | 'sticker';
  mimeType?: string;       // ex: 'audio/ogg; codecs=opus', 'image/jpeg'
  fileName?: string;       // para documentos
}

export interface Chat {
  id: string;
  customerName: string;
  status: 'active' | 'archived';
  aiEnabled: boolean;
  lastMessage: string;
  lastMessageAt: any; // Firebase Timestamp
}
