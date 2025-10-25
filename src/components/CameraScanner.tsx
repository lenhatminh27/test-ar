import { useRef, useEffect, useState } from "react";
import useVectorExtractor from "../hooks/useVectorExtractor";
import useWSClient from "../hooks/useWSClient";

export default function CameraScanner() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { extractVector, modelLoaded } = useVectorExtractor();
    const { sendVector } = useWSClient();
    const [vectorLength, setVectorLength] = useState<number | null>(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
            if (videoRef.current) videoRef.current.srcObject = stream;
        });
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current || !modelLoaded) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(videoRef.current, 0, 0);

        const vector = await extractVector(canvas);
        if (vector) {
            setVectorLength(vector.length);
            sendVector(vector);
        }
    };

    return (
        <div>
            <video ref={videoRef} autoPlay playsInline width={320} />
            <div style={{ marginTop: "10px" }}>
                <button
                    onClick={handleCapture}
                    disabled={!modelLoaded}
                    style={{ padding: "8px 12px", fontWeight: "bold" }}
                >
                    {modelLoaded ? "📸 Quét ảnh" : "⏳ Đang load model..."}
                </button>
            </div>
            {vectorLength && (
                <p style={{ marginTop: "10px" }}>
                    ✅ Vector embedding có <strong>{vectorLength}</strong> chiều
                </p>
            )}
        </div>
    );
}
