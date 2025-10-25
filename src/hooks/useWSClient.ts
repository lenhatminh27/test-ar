import { useRef } from "react";
import type { ClientMessage, ServerMessage} from "../type/wv-message.type.ts";

export default function useWSClient() {
    const logRef = useRef<string[]>([]);

    // Fake send WS: chỉ log ra màn hình
    const sendVector = (vector: number[]) => {
        const msg: ClientMessage = {
            type: "feature_vector",
            vector,
            timestamp: Date.now(),
        };
        logRef.current.push(`📤 Gửi vector ${vector.length} chiều`);
        console.log("📤 Gửi vector:", msg);
    };

    // Fake receive WS: bạn có thể mô phỏng dữ liệu trả về sau này
    const receiveMock = (): ServerMessage => ({
        type: "match_result",
        id: "poster001",
        similarity: 0.92,
        video_url: "https://cdn.example.com/poster001.mp4",
    });

    return { sendVector, logRef, receiveMock };
}
