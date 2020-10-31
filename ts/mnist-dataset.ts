import * as tf from "@tensorflow/tfjs";
import { Inflate } from "pako";

const IMAGE_DATA_START = 16;
const LABEL_DATA_START = 8;

export interface MnistEntry {
  label: number;
  image: tf.Tensor2D;
}

export default class MnistDataset {
  private static readonly _NORMALIZE_FACTOR = tf.scalar(1.0 / 255.0, "float32");

  private _imageData: Uint8Array | null = null;
  private _labelData: Uint8Array | null = null;
  private _numberOfImages = 0;
  private _numberOfRows = 0;
  private _numberOfColumns = 0;

  private _imageDataSize = 0;
  private _cursor = 0;

  public get numberOfRows() {
    return this._numberOfRows;
  }

  public get numberOfColumns() {
    return this._numberOfColumns;
  }

  constructor(private imagesUrl: string, private labelsUrl: string) {}

  public async load(): Promise<void> {
    const [imagesResponse, labelsResponse] = await Promise.all([
      fetch(this.imagesUrl),
      fetch(this.labelsUrl),
    ]);

    if (imagesResponse.body && labelsResponse.body) {
      [this._imageData, this._labelData] = await Promise.all([
        MnistDataset.inflate(imagesResponse.body),
        MnistDataset.inflate(labelsResponse.body),
      ]);
      this._numberOfImages = MnistDataset.readUInt32(4, this._imageData);
      this._numberOfRows = MnistDataset.readUInt32(8, this._imageData);
      this._numberOfColumns = MnistDataset.readUInt32(12, this._imageData);
      this._imageDataSize = this._numberOfRows * this._numberOfColumns;
    } else {
      return Promise.reject("LOADING DATA FAILED!");
    }
  }

  public nextBatch(size: number) {
    if (this._labelData && this._imageData) {
      const labelData = this._labelData;
      const imageData = this._imageData;
      const batch = [...Array(size).keys()]
        .map((i) => (i + this._cursor) % this._numberOfImages)
        .map((i) => [
          i + LABEL_DATA_START,
          i * this._imageDataSize + IMAGE_DATA_START,
        ])
        .map(([labelIndex, imageIndex]) => ({
          label: labelData[labelIndex],
          imageData: imageData.slice(
            imageIndex,
            imageIndex + this._imageDataSize
          ),
        }))
        .map<MnistEntry>(({ label, imageData }) => ({
          label,
          image: tf
            .tensor2d(
              imageData,
              [this._numberOfRows, this._numberOfColumns],
              "float32"
            )
            .mul(MnistDataset._NORMALIZE_FACTOR),
        }));

      this._cursor = (this._cursor + size) % this._numberOfImages;
      return batch;
    } else {
      return [];
    }
  }

  /**
   * inflate a stream with the pako Inflator!
   * @param stream compressed Data
   */
  private static async inflate(
    stream: ReadableStream<Uint8Array>
  ): Promise<Uint8Array> {
    const reader = stream.getReader();
    const inflator = new Inflate();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      } else if (value) {
        inflator.push(value);
      }
    }

    return inflator.result as Uint8Array;
  }

  private static readUInt32(position: number, data: Uint8Array) {
    let result = 0;
    for (let i = 0; i < 4; i++) {
      result = (result << 8) + data[i + position];
    }
    return result;
  }
}
