import { IInputs, IOutputs } from "./generated/ManifestTypes";
import "./style/style.css";

// SVG Icons
const SAVE_ICON = `<svg viewBox="0 0 2048 2048"><path d="M1792 603v1317H256V128h1221l315 315v160h-160V237l-267-267H416v512h1024V128h91v421h261zm-1536 0h1024V256H256v347zm1280 1213V768H512v1048h1024zm-128-896v128H640V920h768z"/></svg>`;
const CLEAR_ICON = `<svg viewBox="0 0 2048 2048"><path d="M1664 1664h-384v-128h221l-349-349-349 349h221v128H640v-128h221l-413-413 90-90 323 323 323-323 90 90-413 413h221v128zM1536 384v768h-128V384H640v768H512V256h1024v128zm-256 768v-128h128v128h-128zm-384-128h128v128H896v-128zm-256 0h128v128H640v-128z"/></svg>`;
const UPLOAD_ICON = `<svg viewBox="0 0 2048 2048"><path d="M1792 1408v256h-256v128h256v256h128v-256h256v-128h-256v-256h-128zm-384 128V960H256v896h1152v-320h128v320q0 27-10 50t-27 40-41 28-50 10H256q-27 0-50-10t-40-27-28-41-10-50V960q0-27 10-50t27-40 41-28 50-10h1152q27 0 50 10t40 27 28 41 10 50v576h-128zm-128-768H384V384h357l256 256h283v299h128V640q0-27-10-50t-27-40-41-28-50-10H941L685 256H384q-27 0-50 10t-40 27-28 41-10 50v512h1024z"/></svg>`;
const MORE_ICON = `<svg viewBox="0 0 2048 2048"><path d="M512 896q53 0 99 20t82 55 55 81 20 100q0 53-20 99t-55 82-81 55-100 20q-53 0-99-20t-82-55-55-81-20-100q0-53 20-99t55-82 81-55 100-20zm0 384q27 0 50-10t40-27 28-41 10-50q0-27-10-50t-27-40-41-28-50-10q-27 0-50 10t-40 27-28 41-10 50q0 27 10 50t27 40 41 28 50 10zm1024-384q53 0 99 20t82 55 55 81 20 100q0 53-20 99t-55 82-81 55-100 20q-53 0-99-20t-82-55-55-81-20-100q0-53 20-99t55-82 81-55 100-20zm0 384q27 0 50-10t40-27 28-41 10-50q0-27-10-50t-27-40-41-28-50-10q-27 0-50 10t-40 27-28 41-10 50q0 27 10 50t27 40 41 28 50 10zm-512-384q53 0 99 20t82 55 55 81 20 100q0 53-20 99t-55 82-81 55-100 20q-53 0-99-20t-82-55-55-81-20-100q0-53 20-99t55-82 81-55 100-20zm0 384q27 0 50-10t40-27 28-41 10-50q0-27-10-50t-27-40-41-28-50-10q-27 0-50 10t-40 27-28 41-10 50q0 27 10 50t27 40 41 28 50 10z"/></svg>`;

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
    private notifyOutput: () => void
    // Default image URL
    private defaultImageUrl: string;
    private savedImageContents: string;

    // UI Elements
    private toolbar: HTMLDivElement;
    private overflowMenu: HTMLDivElement;
    private moreButton: HTMLButtonElement;

    // Controls to potentially move
    private strokeWidthInput: HTMLInputElement;
    private colorPicker: HTMLInputElement;
    private clearButton: HTMLButtonElement;
    private downloadButton: HTMLButtonElement;
    private uploadLabel: HTMLLabelElement;
    private inputImage: HTMLInputElement;

    private isInitialized: boolean = false;

    // Cached State
    private cachedImage: HTMLImageElement | null = null;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.notifyOutput = notifyOutputChanged;
        this.container = container;
        this.container.classList.add("pcf-draw-container");

        // Canvas
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("pcf-draw-canvas");
        this.container.appendChild(this.canvas);

        this.context = this.canvas.getContext("2d");

        // Initialization of Tools
        this.initTools();

        // Add event listeners for drawing
        this.canvas.addEventListener("mousedown", this.startDrawing.bind(this));
        this.canvas.addEventListener("mousemove", this.draw.bind(this));
        this.canvas.addEventListener("mouseup", this.stopDrawing.bind(this));
        this.canvas.addEventListener("mouseout", this.stopDrawing.bind(this));

        // Initial property fetch
        this.updateProperties(context);

        // Initial load
        if (this.defaultImageUrl) {
            this.loadDefaultImage(this.defaultImageUrl);
        }

        this.isInitialized = true;
    }

    private updateProperties(context: ComponentFramework.Context<IInputs>): void {
        this.fileName = context.parameters.FileName.raw || "download";
        this.canvasBackground = context.parameters.CanvasBackground.raw || "white";
        this.enableDownload = context.parameters.EnableDownload.raw === "1";
        this.enableUpload = context.parameters.EnableUpload.raw === "1";
        this.defaultImageUrl = context.parameters.DefaultImage.raw || "";

        // Update Canvas Background
        this.canvas.style.backgroundColor = this.canvasBackground;

        // Update Button Visibility
        if (this.uploadLabel) {
            this.uploadLabel.style.display = this.enableUpload ? 'flex' : 'none';
        }
        if (this.downloadButton) {
            // Check if it's in toolbar or overflow to update the correct instance display?
            // Actually we are just checking if it should be in the DOM. 
            // The Responsive logic in updateView handles physical placement.
            // But we can toggle display here for simplicity if the responsive logic is strictly width-based.
            // However, the responsive logic appends/removes. 
            // Let's ensure the element itself has the right display property if it's visible.
            this.downloadButton.style.display = this.enableDownload ? 'flex' : 'none';
        }
    }

    // Container for Stroke Controls
    private strokeContainer: HTMLDivElement;

    private initTools(): void {
        // Toolbar Container
        this.toolbar = document.createElement("div");
        this.toolbar.classList.add("pcf-draw-toolbar");

        // Overflow Menu Container
        this.overflowMenu = document.createElement("div");
        this.overflowMenu.classList.add("pcf-draw-overflow-menu");

        // --- Create Controls ---

        // Stroke Width
        this.strokeContainer = document.createElement("div");
        this.strokeContainer.classList.add("pcf-draw-group-container");
        this.strokeContainer.title = "Pen Size";

        // Pen Icon
        const penIcon = document.createElement("div");
        penIcon.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
        penIcon.classList.add("pcf-draw-icon-label");

        this.strokeWidthInput = document.createElement("input");
        this.strokeWidthInput.type = "number";
        this.strokeWidthInput.value = "5";
        this.strokeWidthInput.min = "1";
        this.strokeWidthInput.max = "50";
        this.strokeWidthInput.classList.add("pcf-draw-stroke-width");
        this.strokeWidthInput.addEventListener("change", (e) => {
            this.currentLineWidth = parseInt((e.target as HTMLInputElement).value, 10);
        });

        this.strokeContainer.appendChild(penIcon);
        this.strokeContainer.appendChild(this.strokeWidthInput);

        // Color Picker
        const colorWrapper = document.createElement("div");
        colorWrapper.classList.add("pcf-draw-overflow-input-container");
        this.colorPicker = document.createElement("input");
        this.colorPicker.type = "color";
        this.colorPicker.value = "#ff0000";
        this.colorPicker.classList.add("pcf-draw-color-picker");
        this.colorPicker.addEventListener("input", (e) => {
            this.currentColor = (e.target as HTMLInputElement).value;
        });
        colorWrapper.appendChild(this.colorPicker);

        // Upload
        this.inputImage = document.createElement("input");
        this.inputImage.type = "file";
        this.inputImage.accept = "image/*";
        this.inputImage.classList.add("pcf-draw-image-upload");
        this.inputImage.addEventListener("change", this.onImageUpload.bind(this));

        this.uploadLabel = document.createElement("label");
        this.uploadLabel.innerHTML = `${UPLOAD_ICON}<span>Upload</span>`;
        this.uploadLabel.classList.add("pcf-draw-button", "pcf-draw-image-upload-label");
        this.uploadLabel.title = "Upload Image";
        this.uploadLabel.appendChild(this.inputImage);

        // Clear
        this.clearButton = document.createElement("button");
        this.clearButton.innerHTML = `${CLEAR_ICON}<span>Clear</span>`;
        this.clearButton.classList.add("pcf-draw-button");
        this.clearButton.title = "Clear Canvas";
        this.clearButton.addEventListener("click", this.clearCanvas.bind(this));

        // Save
        this.downloadButton = document.createElement("button");
        this.downloadButton.innerHTML = `${SAVE_ICON}<span>Save</span>`;
        this.downloadButton.classList.add("pcf-draw-button");
        this.downloadButton.title = "Save Image";
        this.downloadButton.addEventListener("click", this.downloadImage.bind(this));

        // More Button
        this.moreButton = document.createElement("button");
        this.moreButton.innerHTML = MORE_ICON;
        this.moreButton.classList.add("pcf-draw-button", "pcf-draw-icon-only", "pcf-draw-more-button");
        this.moreButton.title = "More Options";
        this.moreButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.overflowMenu.classList.toggle("visible");
        });
        // Close menu on click outside
        document.addEventListener("click", (e) => {
            if (this.overflowMenu && this.overflowMenu.classList.contains("visible") &&
                !this.overflowMenu.contains(e.target as Node) &&
                e.target !== this.moreButton &&
                !this.moreButton.contains(e.target as Node)) {
                this.overflowMenu.classList.remove("visible");
            }
        });

        // Add elements to DOM
        this.toolbar.appendChild(this.strokeContainer);
        this.toolbar.appendChild(this.colorPicker);
        this.toolbar.appendChild(this.uploadLabel);
        this.toolbar.appendChild(this.clearButton);
        this.toolbar.appendChild(this.downloadButton);
        this.toolbar.appendChild(this.moreButton);

        this.container.appendChild(this.toolbar);
        this.container.appendChild(this.overflowMenu);
    }

    // Track if current image is uploaded
    private isUploadedImage: boolean = false;

    private loadDefaultImage(url: string): void {
        if (!url || url.trim() === "") {
            return;
        }
        console.log("Loading default image from:", url);
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            console.log("Default image loaded successfully");
            this.cachedImage = image;
            this.isUploadedImage = false; // It's a default image
            this.drawImageToFitCanvas(image);
        };
        image.onerror = (e) => {
            console.error("Failed to load image with CORS anonymous. Retrying without CORS...", url, e);
            // Retry without crossOrigin (might work for some local/non-cors sources, but canvas will be tainted)
            const retryImage = new Image();
            retryImage.onload = () => {
                console.log("Default image loaded (without CORS)");
                this.cachedImage = retryImage;
                this.isUploadedImage = false;
                this.drawImageToFitCanvas(retryImage);
                // Note: Tainted canvas cannot be saved/exported.
            };
            retryImage.onerror = (err) => {
                console.error("Failed to load image on retry:", url, err);
            };
            retryImage.src = url;
        };
        image.src = url;
    }

    private onImageUpload(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                // Local file doesn't need crossOrigin usually, but consistency is good.
                image.onload = () => {
                    this.cachedImage = image;
                    this.isUploadedImage = true; // Mark as uploaded
                    this.drawImageToFitCanvas(image);
                };
                image.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    private drawImageToFitCanvas(image: HTMLImageElement): void {
        if (this.context && this.canvas.width > 0 && this.canvas.height > 0) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            const scale = Math.min(
                this.canvas.width / image.width,
                this.canvas.height / image.height
            );
            const x = (this.canvas.width - image.width * scale) / 2;
            const y = (this.canvas.height - image.height * scale) / 2;
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

            // Logic: 
            // 1. If we have a cached image AND it is the Default Image (not uploaded), restore it.
            // 2. If it's an uploaded image, we clear it (per user request).

            if (this.cachedImage && !this.isUploadedImage && this.defaultImageUrl) {
                this.drawImageToFitCanvas(this.cachedImage);
            } else {
                this.cachedImage = null; // Clear cache
                this.isUploadedImage = false; // Reset state
            }
        }
    }

    private downloadImage(): void {
        const link = document.createElement("a");
        link.download = this.fileName + ".png";
        link.href = this.canvas.toDataURL("image/png");
        this.savedImageContents = this.canvas.toDataURL("image/png");
        this.notifyOutput();
        // Only click if enabled? user might just want the string output.
        // But logic says if enableDownload is true.
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
            // We should ideally update the cached image or output here, but for now we wait for save.
            // If we want to persist drawing across resize, we need to save the drawing state (canvas snapshot)
            // Save snapshot to cache
            // However, this is advanced. For now, we only preserve the Background Image on resize.
            // If the user draws and then resizes, the drawing might be lost if we clearRect.
            // Fix: Save canvas content to dataURL on stopDrawing?
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // 1. Update Properties
        const prevDefaultImage = this.defaultImageUrl;
        this.updateProperties(context);

        // 2. Check changes
        if (this.defaultImageUrl !== prevDefaultImage && this.defaultImageUrl) {
            this.loadDefaultImage(this.defaultImageUrl);
        }

        // 3. Handle Dimensions
        // Fallback to container client dimensions if allocated is missing/zero (common in some harnesses)
        let allocatedWidth = context.mode.allocatedWidth;
        let allocatedHeight = context.mode.allocatedHeight;

        if (!allocatedWidth || allocatedWidth === -1) {
            allocatedWidth = this.container.clientWidth;
        }
        if (!allocatedHeight || allocatedHeight === -1) {
            allocatedHeight = this.container.clientHeight;
        }

        // Default to a reasonable size if still 0 (e.g., invisible or initial load)
        if (allocatedWidth === 0) allocatedWidth = 300;
        if (allocatedHeight === 0) allocatedHeight = 300;

        const toolbarHeight = 44; // From CSS
        const desiredWidth = allocatedWidth;
        const desiredHeight = Math.max(allocatedHeight - toolbarHeight, 1); // Ensure at least 1px

        // Resize Canvas Buffer
        if (this.canvas.width !== desiredWidth || this.canvas.height !== desiredHeight) {
            // Save content if needed (for now just using cached image for background)
            // Implementation choice: We prioritize the background image staying correct.
            this.canvas.width = desiredWidth;
            this.canvas.height = desiredHeight;

            if (this.cachedImage) {
                this.drawImageToFitCanvas(this.cachedImage);
            }
        }

        // 4. Responsive Toolbar Logic
        // Force Update of Button Displays based on properties first
        if (this.uploadLabel) this.uploadLabel.style.display = this.enableUpload ? 'flex' : 'none';
        if (this.downloadButton) this.downloadButton.style.display = this.enableDownload ? 'flex' : 'none';

        // Then handle structural moves
        if (allocatedWidth < 500) {
            // --- Overflow Mode ---
            this.moreButton.style.display = 'flex';
            this.overflowMenu.classList.remove("visible"); // Start hidden

            // Move items to Overflow Menu
            try {
                // Use strokeContainer now
                if (this.strokeContainer) this.moveElementTo(this.strokeContainer, this.overflowMenu);
                this.moveElementTo(this.colorPicker, this.overflowMenu);
                if (this.uploadLabel && this.enableUpload) this.moveElementTo(this.uploadLabel, this.overflowMenu);
                this.moveElementTo(this.clearButton, this.overflowMenu);
            } catch (e) {
                console.error("Error moving elements to overflow:", e);
            }

            // Keep Save button on Toolbar if possible
            if (this.downloadButton && this.enableDownload) {
                this.moveElementTo(this.downloadButton, this.toolbar, this.moreButton);
            }

        } else {
            // --- Toolbar Mode ---
            this.moreButton.style.display = 'none';
            this.overflowMenu.classList.remove("visible");

            // Move items back to Toolbar
            // We use 'this.moreButton' as the reference point to insert before,
            // so they appear to the left of the (hidden) more button.
            try {
                if (this.strokeContainer) this.moveElementTo(this.strokeContainer, this.toolbar, this.moreButton);
                this.moveElementTo(this.colorPicker, this.toolbar, this.moreButton);
                if (this.uploadLabel && this.enableUpload) this.moveElementTo(this.uploadLabel, this.toolbar, this.moreButton);
                this.moveElementTo(this.clearButton, this.toolbar, this.moreButton);
                if (this.downloadButton && this.enableDownload) this.moveElementTo(this.downloadButton, this.toolbar, this.moreButton);
            } catch (e) {
                console.error("Error moving elements to toolbar:", e);
            }
        }
    }

    // Helper to safely move elements without duplication
    private moveElementTo(element: HTMLElement, target: HTMLElement, beforeElement?: HTMLElement): void {
        if (element.parentElement !== target) {
            if (beforeElement && target.contains(beforeElement)) {
                target.insertBefore(element, beforeElement);
            } else {
                target.appendChild(element);
            }
        }
    }

    public getOutputs(): IOutputs {
        return {
            SavedImage: this.savedImageContents
        };
    }

    public destroy(): void {
        // Cleanup resources
    }
}
