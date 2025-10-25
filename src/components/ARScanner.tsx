import {useEffect, useRef, useState} from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import {images} from "../data/images";

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

    // Load model
    useEffect(() => {
        mobilenet.load({version: 2, alpha: 1.0}).then(setModel);
    }, []);

    // Bật camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {facingMode: {exact: "environment"}},
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.warn("Không mở được camera sau, fallback sang camera trước", error);
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

    // Chuẩn hóa vector
    const normalizeVector = (vec: number[]) => {
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        return vec.map((v) => v / norm);
    };

    // Tính cosine similarity
    const cosineSimilarity = (a: number[], b: number[]) => {
        let dot = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
        }
        return dot;
    };

    // Quét khung hình và overlay video
    const scanFrame = async () => {
        if (!model || !videoRef.current || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Vẽ khung hình camera lên canvas
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        // Tính vector đặc trưng từ khung hình
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

        // Nếu tìm thấy khớp với độ tương đồng > 0.7
        if (bestMatch && bestMatch.similarity > 0.7) {
            setMatch(bestMatch);

            // Tải và vẽ video lên canvas
            const videoElement = document.createElement("video");
            videoElement.src = bestMatch.videoUrl;
            videoElement.autoplay = true;
            videoElement.loop = true;
            videoElement.muted = true;
            videoElement.playsInline = true;

            videoElement.onloadeddata = () => {
                // Vẽ video lên canvas, căn giữa
                const drawVideo = () => {
                    if (!ctx || !videoElement) return;
                    const videoWidth = videoElement.videoWidth;
                    const videoHeight = videoElement.videoHeight;
                    const x = (width - videoWidth) / 2; // Căn giữa ngang
                    const y = (height - videoHeight) / 2; // Căn giữa dọc
                    ctx.drawImage(videoElement, x, y, videoWidth, videoHeight);
                    requestAnimationFrame(drawVideo);
                };
                drawVideo();
            };
        } else {
            setMatch(null);
        }
    };

    // Quét liên tục mỗi 500ms
    useEffect(() => {
        const interval = setInterval(scanFrame, 500);
        return () => clearInterval(interval);
    }, [model]);

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">📸 AR Marker Scanner (1280d)</h2>

            {/* Canvas hiển thị camera và video AR */}
            <canvas
                ref={canvasRef}
                className="w-full max-w-md rounded-md shadow"
            ></canvas>

            {/* Kết quả khớp */}
            {match ? (
                <div className="mt-4 text-center">
                    <p>
                        ✅ Phát hiện: <b>{match.name}</b> — similarity:{" "}
                        <span className="text-green-600 font-semibold">
              {match.similarity.toFixed(3)}
            </span>
                    </p>
                </div>
            ) : (
                <p className="mt-4 text-gray-500 italic">⏳ Đang quét...</p>
            )}
        </div>
    );
}