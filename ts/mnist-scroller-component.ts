import * as tf from "@tensorflow/tfjs";
import MnistDataset from "./mnist-dataset";

import CSS from "../style.css";

const IMAGES_URL = "ressources/t10k-images-idx3-ubyte.gz";
const LABELS_URL = "ressources/t10k-labels-idx1-ubyte.gz";

export default class MnistScrollerComponent extends HTMLElement {
  private _root: ShadowRoot;
  private _scroller: HTMLDivElement;
  private _content: HTMLDivElement;
  private _dataset: MnistDataset;

  private readonly scrollHandler = () => {
    this.fillContent();
  };

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "closed" });
    this._scroller = document.createElement("div");
    this._content = document.createElement("div");
    this._dataset = new MnistDataset(IMAGES_URL, LABELS_URL);

    // Attach styles
    const style = document.createElement("style");
    style.textContent = CSS;
    this._root.appendChild(style);

    // Attach scroller
    this._scroller.className = "scroller";
    this._scroller.appendChild(this._content);
    this._content.className = "content";
    this._root.appendChild(this._scroller);

    // Header...
    const h1 = document.createElement("h1");
    h1.textContent = "MNIST-Dataset infinite scroll";
    this._content.appendChild(h1);
    const h2 = document.createElement("h2");
    h2.textContent = "At least until your browser crashes...";
    this._content.appendChild(h2);
  }

  protected async connectedCallback() {
    if (!this.isConnected) return;
    await this._dataset.load();
    this.fillContent();

    this._scroller.addEventListener("scroll", this.scrollHandler);
  }

  protected disconnectedCallback() {
    this._scroller.removeEventListener("scroll", this.scrollHandler);
  }

  private fillContent() {
    tf.tidy(() => {
      // load data and create canvases
      this._dataset.nextBatch(8).forEach(async ({ label, image }) => {
        const canvas = document.createElement("canvas");
        canvas.width = this._dataset.numberOfColumns;
        canvas.height = this._dataset.numberOfRows;
        canvas.title = label.toString();
        await tf.browser.toPixels(image, canvas);
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
