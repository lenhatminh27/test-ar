import {useEffect, useRef, useState} from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import {images} from "../data/images"; // import mảng ảnh bạn có sẵn

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
        mobilenet.load({version: 2, alpha: 1.0}).then(setModel);
    }, []);

    // 2️⃣ Bật camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: {exact: "environment"}, // 👈 Ưu tiên camera sau
                    },
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.warn("Không mở được camera sau, fallback sang camera trước", error);
                // fallback nếu thiết bị không có hoặc không cho phép camera sau
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
            }
        };

        initCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream)
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        };
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
                bestMatch = {id: img.id, name: img.name, similarity: sim, videoUrl: img.videoUrl};
            }
        }

        // 6️⃣ Nếu độ giống nhau > 0.5 thì hiển thị video
        if (bestMatch && bestMatch.similarity > 0.6) {
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

            {/* 1. Tạo một container 'relative'
              Đây là "khung" AR của chúng ta.
              'mx-auto' để căn giữa.
            */}
            <div className="relative w-full max-w-md mx-auto rounded-md shadow overflow-hidden">
                {/* 2. Video camera (lớp nền) */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full" // Video camera sẽ là lớp nền
                ></video>

                {/* Canvas hidden (vẫn giữ nguyên) */}
                <canvas ref={canvasRef} className="hidden" style={{display: 'none'}}></canvas>

                {/* 3. Video AR (lớp phủ 'absolute')
                  Hiển thị khi 'match' tồn tại.
                */}
                {match && (
                    <div className="absolute top-0 left-0 w-full h-full">
                        {/* Thêm 'key' để React thay thế hoàn toàn thẻ video khi match thay đổi,
                          đảm bảo video mới phát từ đầu.
                        */}
                        <video
                            key={match.id}
                            src={match.videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover" // 'object-cover' để video lấp đầy khung
                        ></video>

                        {/* Thông tin match cũng có thể đặt overlay */}
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white p-2 rounded-md">
                            <p className="text-sm">
                                ✅ Phát hiện: <b>{match.name}</b>
                            </p>
                            <p className="text-xs font-semibold text-green-300">
                                Độ giống: {(match.similarity * 100).toFixed(0)}%
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Hiển thị trạng thái "Đang quét" BÊN DƯỚI khi không có match */}
            {!match && (
                <p className="mt-4 text-center text-gray-500 italic">⏳ Đang quét...</p>
            )}
        </div>
    );
}
