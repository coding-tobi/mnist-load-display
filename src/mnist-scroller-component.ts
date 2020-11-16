import * as tf from "@tensorflow/tfjs";
import MnistDataLoader from "./mnist-data-loader";

import CSS from "../style.css";

const BATCH_SIZE = 8;
const IMAGES_URL = "ressources/t10k-images-idx3-ubyte.gz";
const LABELS_URL = "ressources/t10k-labels-idx1-ubyte.gz";

export default class MnistScrollerComponent extends HTMLElement {
  private _root: ShadowRoot;
  private _scroller: HTMLDivElement;
  private _content: HTMLDivElement;
  private _dataLoader: MnistDataLoader;

  private readonly scrollHandler = () => {
    this.fillContent();
  };

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "closed" });
    this._scroller = document.createElement("div");
    this._content = document.createElement("div");
    this._dataLoader = new MnistDataLoader(IMAGES_URL, LABELS_URL);

    // Attach styles
    const style = document.createElement("style");
    style.textContent = CSS;
    this._root.appendChild(style);

    // Attach scroller
    this._scroller.className = "scroller";
    this._root.appendChild(this._scroller);

    // Header...
    const h1 = document.createElement("span");
    h1.textContent = "MNIST-Dataset infinite scroll";
    h1.style.fontSize = "2em";
    this._scroller.appendChild(h1);
    this._scroller.appendChild(document.createElement("br"));
    const h2 = document.createElement("span");
    h2.textContent = "At least until your browser crashes...";
    h2.style.fontSize = "1.5em";
    this._scroller.appendChild(h2);

    // Attach content container
    this._content.className = "content";
    this._scroller.appendChild(this._content);
  }

  protected async connectedCallback() {
    if (!this.isConnected) return;
    await this._dataLoader.load();
    this.fillContent();

    this._scroller.addEventListener("scroll", this.scrollHandler);
  }

  protected disconnectedCallback() {
    this._scroller.removeEventListener("scroll", this.scrollHandler);
  }

  private fillContent() {
    tf.tidy(() => {
      const batch = this._dataLoader.nextBatch(BATCH_SIZE);
      [...new Array(BATCH_SIZE).keys()].forEach(async (i) => {
        const imageTensor = batch.value.xs
          .slice(
            [i, 0, 0, 0],
            [
              1,
              this._dataLoader.numberOfRows,
              this._dataLoader.numberOfColumns,
              1,
            ]
          )
          .as2D(
            this._dataLoader.numberOfRows,
            this._dataLoader.numberOfColumns
          );
        const labelTensor = batch.value.ys.slice([i, 0], [1, 10]).as1D();
        const label = `label: ${labelTensor.toString()}\nargMax: ${labelTensor
          .argMax()
          .toString()}`;

        const canvas = document.createElement("canvas");
        canvas.width = this._dataLoader.numberOfColumns;
        canvas.height = this._dataLoader.numberOfRows;
        canvas.title = label;
        await tf.browser.toPixels(imageTensor, canvas);
        this._content.appendChild(canvas);
      });
    });

    if (
      this._content.scrollHeight <
      2 * this._scroller.clientHeight + this._scroller.scrollTop
    ) {
      requestAnimationFrame(() => this.fillContent());
    }
  }
}
