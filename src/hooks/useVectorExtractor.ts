import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import { useEffect, useState } from "react";

export default function useVectorExtractor() {
    const [model, setModel] = useState<mobilenet.MobileNet | null>(null);

    useEffect(() => {
        mobilenet.load({ version: 2, alpha: 1.0 }).then(setModel);
    }, []);

    const extractVector = async (imageElement: HTMLCanvasElement | HTMLImageElement) => {
        if (!model) return null;
        const embedding = model.infer(imageElement, true) as tf.Tensor;
        const vector = Array.from(await embedding.data());
        embedding.dispose();
        return vector;
    };

    return { extractVector, modelLoaded: !!model };
}
