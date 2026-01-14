import { IInputs, IOutputs } from "./generated/ManifestTypes";
import "./style/style.css";

export class Draw implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D | null;
    private isDrawing: boolean = false;
    private currentColor: string = "red";
    private canvasBackground: string;
    private fileName: string;
    private currentLineWidth: number = 5;
    private enableDownload: boolean;
    private enableUpload: boolean;
    private inputImage: HTMLInputElement;
    private clearButton: HTMLButtonElement;
    private downloadButton: HTMLButtonElement;
    private strokeWidthInput: HTMLInputElement;
    private colorPicker: HTMLInputElement;
    private notifyOutput: () => void
    // Default image URL
    private defaultImageUrl: string;// = "https://via.placeholder.com/900x600";
    private savedImageContents: string;// = "https://via.placeholder.com/900x600";

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.fileName = context.parameters.FileName.raw ? context.parameters.FileName.raw : "download";
        this.canvasBackground = context.parameters.CanvasBackground.raw ? context.parameters.CanvasBackground.raw : "white";
        this.enableDownload = context.parameters.EnableDownload.raw === "1";
        this.enableUpload = context.parameters.EnableUpload.raw === "1";
        this.defaultImageUrl = context.parameters.DefaultImage.raw ? context.parameters.DefaultImage.raw : "";
        this.notifyOutput = notifyOutputChanged;
        this.container = container;
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("pcf-draw-canvas");
        this.canvas.style.backgroundColor = this.canvasBackground;
        this.canvas.width = container.getBoundingClientRect().width; // Default width
        this.canvas.height = container.getBoundingClientRect().height - 70; // Default height
        this.container.appendChild(this.canvas);

        this.context = this.canvas.getContext("2d");

        // Create input for image upload
        this.inputImage = document.createElement("input");
        this.inputImage.type = "file";
        this.inputImage.accept = "image/*";
        this.inputImage.classList.add("pcf-draw-image-upload");
        this.inputImage.addEventListener("change", this.onImageUpload.bind(this));

        const uploadLabel = document.createElement("label");
        uploadLabel.innerText = "Upload Image";
        uploadLabel.classList.add("pcf-draw-image-upload-label");
        uploadLabel.appendChild(this.inputImage);


        // Create clear button
        this.clearButton = document.createElement("button");
        this.clearButton.innerText = "Clear";
        this.clearButton.classList.add("pcf-draw-clear-button");
        this.clearButton.addEventListener("click", this.clearCanvas.bind(this));

        // Create download button
        this.downloadButton = document.createElement("button");
        this.downloadButton.innerText = "Save";
        this.downloadButton.classList.add("pcf-draw-download-button");
        this.downloadButton.addEventListener("click", this.downloadImage.bind(this));

        // Create stroke width input
        this.strokeWidthInput = document.createElement("input");
        this.strokeWidthInput.type = "number";
        this.strokeWidthInput.value = "5";
        this.strokeWidthInput.classList.add("pcf-draw-stroke-width");
        this.strokeWidthInput.addEventListener("change", (e) => {
            this.currentLineWidth = parseInt((e.target as HTMLInputElement).value, 10);
        });

        // Create color picker
        this.colorPicker = document.createElement("input");
        this.colorPicker.type = "color";
        this.colorPicker.value = "#ff0000";
        this.colorPicker.classList.add("pcf-draw-color-picker");
        this.colorPicker.addEventListener("input", (e) => {
            this.currentColor = (e.target as HTMLInputElement).value;
        });

        // Tools container
        const toolsContainer = document.createElement("div");
        toolsContainer.classList.add("pcf-draw-tools-container");
        toolsContainer.append(
            this.strokeWidthInput,
            this.colorPicker,
            this.clearButton,
            this.downloadButton
        );
        if (this.enableUpload) {
            toolsContainer.append(
                uploadLabel
            );
        }
        this.container.appendChild(toolsContainer);

        // Add event listeners for drawing
        this.canvas.addEventListener("mousedown", this.startDrawing.bind(this));
        this.canvas.addEventListener("mousemove", this.draw.bind(this));
        this.canvas.addEventListener("mouseup", this.stopDrawing.bind(this));
        this.canvas.addEventListener("mouseout", this.stopDrawing.bind(this));

        // Load the default image
        this.loadDefaultImage();
    }

    private loadDefaultImage(): void {
        const image = new Image();
        image.crossOrigin = "anonymous"; // Allow cross-origin requests
        image.onload = () => {
            this.drawImageToFitCanvas(image);
        };
        image.src = this.defaultImageUrl;
    }

    private onImageUpload(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                image.crossOrigin = "anonymous"; // Allow cross-origin requests
                image.onload = () => {
                    this.drawImageToFitCanvas(image);
                };
                image.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    private drawImageToFitCanvas(image: HTMLImageElement): void {
        if (this.context) {
            // Clear the canvas
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Calculate image scaling
            const scale = Math.min(
                this.canvas.width / image.width,
                this.canvas.height / image.height
            );

            // Calculate position to center the image
            const x = (this.canvas.width - image.width * scale) / 2;
            const y = (this.canvas.height - image.height * scale) / 2;

            // Draw the image
            this.context.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                x,
                y,
                image.width * scale,
                image.height * scale
            );
        }
    }


    private clearCanvas(): void {
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    private downloadImage(): void {
        const link = document.createElement("a");
        link.download = this.fileName + ".png";
        link.href = this.canvas.toDataURL("image/png");
        this.savedImageContents = this.canvas.toDataURL("image/png");
        this.notifyOutput();
        if (this.enableDownload) {
            link.click();
        }
    }

    private startDrawing(event: MouseEvent): void {
        if (this.context) {
            this.isDrawing = true;
            this.context.beginPath();
            this.context.moveTo(event.offsetX, event.offsetY);
        }
    }

    private draw(event: MouseEvent): void {
        if (this.isDrawing && this.context) {
            this.context.lineTo(event.offsetX, event.offsetY);
            this.context.strokeStyle = this.currentColor;
            this.context.lineWidth = this.currentLineWidth;
            this.context.lineJoin = "round";
            this.context.lineCap = "round";
            this.context.stroke();
        }
    }

    private stopDrawing(): void {
        if (this.isDrawing && this.context) {
            this.isDrawing = false;
            this.context.closePath();
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Handle updates from the framework
    }

    public getOutputs(): IOutputs {
        // Return outputs if needed
        return {
            SavedImage: this.savedImageContents
        };
    }

    public destroy(): void {
        // Cleanup resources
    }
}
