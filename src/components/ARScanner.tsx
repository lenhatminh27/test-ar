import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { images } from "../data/images"; // import mảng ảnh bạn có sẵn

interface MatchResult {
    id: number;
    name: string;
    similarity: number;
    videoUrl: string;
}

export default function ARScanner() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
    const [match, setMatch] = useState<MatchResult | null>(null);

    // 1️⃣ Load model
    useEffect(() => {
        mobilenet.load({ version: 2, alpha: 1.0 }).then(setModel);
    }, []);

    // 2️⃣ Bật camera
    useEffect(() => {
        const initCamera = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        };
        initCamera();
    }, []);

    // 3️⃣ Hàm chuẩn hóa vector
    const normalizeVector = (vec: number[]) => {
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        return vec.map(v => v / norm);
    };

    // 4️⃣ Hàm tính cosine similarity
    const cosineSimilarity = (a: number[], b: number[]) => {
        let dot = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
        }
        return dot;
    };

    // 5️⃣ Hàm quét ảnh từ camera → vector → so khớp
    const scanFrame = async () => {
        if (!model || !videoRef.current || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        const imgTensor = tf.browser.fromPixels(canvasRef.current);
        const embedding = model.infer(imgTensor, true) as tf.Tensor;
        const vec = Array.from(await embedding.data());
        embedding.dispose();
        imgTensor.dispose();

        const normalized = normalizeVector(vec);

        let bestMatch: MatchResult | null = null;

        for (const img of images) {
            const sim = cosineSimilarity(normalized, img.vector);
            if (!bestMatch || sim > bestMatch.similarity) {
                bestMatch = { id: img.id, name: img.name, similarity: sim, videoUrl: img.videoUrl };
            }
        }

        // 6️⃣ Nếu độ giống nhau > 0.5 thì hiển thị video
        if (bestMatch && bestMatch.similarity > 0.5) {
            setMatch(bestMatch);
        } else {
            setMatch(null);
        }
    };

    // 7️⃣ Quét liên tục mỗi 500ms
    useEffect(() => {
        const interval = setInterval(scanFrame, 500);
        return () => clearInterval(interval);
    }, [model]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">📸 AR Marker Scanner (1280d)</h2>

            {/* Camera feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md rounded-md shadow"
            ></video>

            {/* Canvas hidden */}
            <canvas ref={canvasRef} className="hidden" style={{display: 'none'}}></canvas>

            {/* Match result */}
            {match ? (
                <div className="mt-4 text-center">
                    <p>
                        ✅ Phát hiện: <b>{match.name}</b> — similarity:{" "}
                        <span className="text-green-600 font-semibold">
              {match.similarity.toFixed(3)}
            </span>
                    </p>
                    <video
                        src={match.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="mt-2 w-full max-w-md rounded-lg shadow-lg"
                    ></video>
                </div>
            ) : (
                <p className="mt-4 text-gray-500 italic">⏳ Đang quét...</p>
            )}
        </div>
    );
}
