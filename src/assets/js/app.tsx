/// <reference types="vite/client" />
import '../css/app.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'
import "leaflet/dist/leaflet.css";
import 'cropperjs/dist/cropper.css';

import * as InertiajsReact from '@inertiajs/react'
import { createRoot } from 'react-dom/client';
import React from 'react';
import ReactDOM from 'react-dom';
import { registerUIComponents } from "./ui-globals";
import * as LucideReact from 'lucide-react'
const { createInertiaApp, router } = InertiajsReact;
window.React = React;
window.ReactDOM = ReactDOM;
//@ts-ignore
window.InertiajsReact = InertiajsReact


// Passing icons
//@ts-ignore 
window.LucideReact = LucideReact

registerUIComponents();

// Prevent Inertia from opening iframe for non-Inertia responses
// When server returns non-Inertia response (HTML redirect), do full page reload instead
let isNavigating = false;

router.on('navigate', (_event) => {
    isNavigating = true;
})

router.on('finish', (_event) => {
    isNavigating = false;
})

// Intercept iframe creation by Inertia
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tagName: string, options?: any) {
    const element = originalCreateElement(tagName, options);
    
    // If Inertia tries to create an iframe during navigation, prevent it and reload page
    if (tagName.toLowerCase() === 'iframe' && isNavigating) {
        console.warn('[Adminizer] Prevented iframe creation, forcing full page reload');
        
        // Do full page reload instead of iframe
        setTimeout(() => {
            window.location.reload();
        }, 0);
        
        // Return a dummy element that won't be used
        return originalCreateElement('div');
    }
    
    return element;
};

createInertiaApp({
    title: (title) => `${title}`,
    resolve: async (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx');
        const module = await pages[`./pages/${name}.tsx`]() as { default: React.ComponentType<any> };
        return module.default;
    },
    setup({el, App, props}) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#0f4898'
    },
})
