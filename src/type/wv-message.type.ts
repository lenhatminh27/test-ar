export interface FeatureVectorMessage {
    type: "feature_vector";
    vector: number[];
    timestamp: number;
}

export interface MatchResultMessage {
    type: "match_result";
    id: string;
    similarity: number;
    video_url: string;
}

export interface ErrorMessage {
    type: "error";
    message: string;
}

export type ClientMessage = FeatureVectorMessage;
export type ServerMessage = MatchResultMessage | ErrorMessage;
