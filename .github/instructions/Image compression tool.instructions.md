---
applyTo: '**'
---

### **Purpose and Features**
1. **Image Compression**:
   - The tool uses the `browser-image-compression` library to compress images.
   - It supports lossy formats like JPEG and WebP and lossless formats like PNG.
   - Compression options include resizing dimensions, setting quality levels, and handling different image types.

2. **File Management**:
   - The tool tracks the state of uploaded files using `useRef` and `useState` hooks.
   - It maintains references to original and compressed file URLs for efficient memory management (e.g., revoking object URLs).

3. **UI Components**:
   - The app uses a modular component-based architecture with reusable UI elements like buttons, sliders, switches, and progress bars.
   - Components are imported from a custom library (`@/components/ui`) and styled using Tailwind CSS.

4. **Chart Visualization**:
   - The app includes a charting feature using the `recharts` library.
   - Charts are styled dynamically based on themes (light/dark) and custom configurations.
   - Tooltips and legends are customizable, with options for icons, labels, and indicators.

5. **Accessibility and Responsiveness**:
   - The app uses semantic HTML and React components to ensure accessibility.
   - It is responsive, with styles like `aspect-video` and grid-based layouts for flexible UI scaling.

6. **Developer Features**:
   - The app includes scripts for development (`vite`), linting (`eslint`), and building the project.
   - It uses modern JavaScript/TypeScript features and follows best practices for modularity and maintainability.

---

### **UI Style and Colors**
1. **Styling Framework**:
   - The app uses **Tailwind CSS** for styling, as indicated in the components.json file.
   - It supports CSS variables for dynamic theming and customization.

2. **Themes**:
   - Two themes are defined: `light` and `dark`.
   - The `dark` theme applies styles using the `.dark` CSS selector.

3. **Color Palette**:
   - The base color is `slate`, as specified in the Tailwind configuration.
   - Custom colors are defined for charts using CSS variables (e.g., `--color-bg`, `--color-border`).

4. **UI Elements**:
   - The UI includes modern, minimalistic components with rounded corners, shadows, and muted colors for a clean look.
   - Components like progress bars, sliders, and tooltips are styled for clarity and usability.

---

### **Code Structure**
1. **Frontend Framework**:
   - The app is built using **React** with TypeScript for type safety.
   - It uses `vite` as the build tool for fast development and optimized builds.

2. **Component Organization**:
   - Components are organized into a `ui` folder, with aliases defined in components.json for easier imports.
   - Examples include `Button`, `Input`, `Label`, and `Card`.

3. **State Management**:
   - React hooks (`useState`, `useRef`, `useContext`) are used for managing state and context.
   - The `ChartContext` provides configuration data for chart components.

4. **File Structure**:
   - The main entry point is index.html, which loads the React app from main.tsx.
   - The app's logic is split across multiple files for modularity.

---

### **Notable Code Snippets**
1. **Chart Configuration**:
   ```tsx
   const ChartContext = React.createContext<ChartContextProps | null>(null);
   const ChartContainer = React.forwardRef<HTMLDivElement, ChartProps>(
     ({ config, children, ...props }, ref) => {
       const chartId = `chart-${React.useId().replace(/:/g, "")}`;
       return (
         <ChartContext.Provider value={{ config }}>
           <div data-chart={chartId} ref={ref} {...props}>
             <ChartStyle id={chartId} config={config} />
             <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
           </div>
         </ChartContext.Provider>
       );
     }
   );
   ```

2. **Image Compression Logic**:
   ```tsx
   const runCompressionOnFile = async (fileState: ImageFileState): Promise<Partial<ImageFileState>> => {
     const { id, originalFile, originalType } = fileState;
     updateFileState(id, { status: 'compressing', error: null });

     try {
       const options: imageCompression.Options = { useWebWorker: true };
       const compressedFile = await imageCompression(originalFile, options);
       return { compressedFile };
     } catch (error) {
       updateFileState(id, { status: 'error', error: error.message });
       return {};
     }
   };
   ```

3. **Dynamic Chart Styling**:
   ```tsx
   const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
     const colorConfig = Object.entries(config).filter(([_, cfg]) => cfg.theme || cfg.color);
     return (
       <style
         dangerouslySetInnerHTML={{
           __html: Object.entries(THEMES)
             .map(([theme, prefix]) => `
               ${prefix} [data-chart=${id}] {
                 ${colorConfig.map(([key, cfg]) => `--color-${key}: ${cfg.color || cfg.theme?.[theme]};`).join("\n")}
               }
             `)
             .join("\n"),
         }}
       />
     );
   };
   ```

---

### **Conclusion**
The **Bulk Image Optimizer** is a modern, feature-rich web tool for image compression and visualization. It combines React, Tailwind CSS, and recharts to deliver a responsive and visually appealing user interface. The app is well-structured, with a focus on modularity, reusability, and performance.