import { useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

export default function GenerateMarkerVector() {
    const [vector, setVector] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const model = await mobilenet.load({ version: 2, alpha: 1.0 });

        const imgURL = URL.createObjectURL(file);
        const img = new Image();
        img.src = imgURL;
        await new Promise(resolve => (img.onload = resolve));

        const tensor = tf.browser.fromPixels(img);
        const embedding = model.infer(tensor, true) as tf.Tensor;
        const rawVec = Array.from(await embedding.data());

        // ✅ Chuẩn hóa vector
        const norm = Math.sqrt(rawVec.reduce((s, v) => s + v * v, 0));
        const normalizedVec = rawVec.map(v => v / norm);

        tensor.dispose();
        embedding.dispose();

        setVector(normalizedVec);
        setLoading(false);
    };

    return (
        <div className="p-6">
            <h2 className="text-lg font-bold mb-3">🧠 Generate Marker Vector</h2>
            <input type="file" accept="image/*" onChange={handleUpload} />
            {loading && <p>⏳ Đang xử lý...</p>}
            {vector && (
                <div className="mt-4">
                    <p>✅ Đã tạo vector {vector.length} chiều:</p>
                    <textarea
                        value={`vector: [${vector.join(", ")}],`}
                        rows={10}
                        readOnly
                        className="w-full border p-2 rounded"
                    ></textarea>
                    <p className="text-gray-500 text-sm mt-2">
                        👉 Copy đoạn này vào <code>images.ts</code>
                    </p>
                </div>
            )}
        </div>
    );
}
