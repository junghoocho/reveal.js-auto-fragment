/**
 * A plugin that adds fragment class to top-level elements of each slide
 *
 * @author Junghoo Cho at UCLA
 */

class AutoFragmentPlugIn {
    constructor() {
        // plugin ID
        this.id = 'autoFragment';
        // default plugin options
        this.options = {
            enabled: false, // by default, auto fragment is disabled
            skip: 0,        // add fragment class to slide top-level elements, 
                            // after skipping first "skip" elements
            indexStart: 10, // data-fragment-index is set to "indexStart" for the first element
            indexStep: 10,  // and is increased by "indexStep" for subsequence elements
        }
    }

    // add fragment class and data-fragment-index attribute to the list of elements
    addFragment(elements, options) {
        if (elements.length === 0)  return;

        let {skip, indexStart, initRelative, indexStep} = options;

        // if initRelative is true, add the data-fragment-index value of the nearest ancestor to indexStart
        if (initRelative) {
            let element = elements[0];
            while (element.parentNode && !element.classList.contains('slides')) {
                console.log(JSON.stringify(element));
                element = element.parentNode;
                if (element.hasAttribute("data-fragment-index")) {
                    indexStart += parseInt(element.getAttribute("data-fragment-index"));
                    break;
                }
            }
        }
        
        let i = 0;
        for (let element of elements) {
            // add fragment class to the element after skipping the first "skip" elements
            if (++i > skip && !element.classList.contains("fragment")) {
                element.classList.add("fragment");
            }
            // add data-fragment-index attribute to the element
            if (!element.hasAttribute("data-fragment-index")) {
                element.setAttribute("data-fragment-index", indexStart + (i-1)*indexStep);
            }
        }
    }

    // get auto fragment option values from the data-auto-fragment attribute
    getOptionsFromAttr(options, element) {
        // if no data-auto-fragment attribute, nothing to do
        if (!element.hasAttribute("data-auto-fragment")) return;

        // get data-auto-fragment attribute
        let attr = element.getAttribute("data-auto-fragment");
        element.removeAttribute("data-auto-fragment");
        options.enabled = true;

        // if empty attribute, we we done
        if (attr === "") return;

        // if attribute value is false, disable auto-fragment and we are done
        if (attr === "false") {
            options.enabled = false;
            return;
        }

        // parse the attribute value. expected format: "int,int,int"
        let values = attr.split(",").map(v => v.trim());
        if (values.length >= 1 && values[0].length > 0) {
            options.skip = parseInt(values[0]);
        }
        if (values.length >= 2 && values[1].length > 0) {
            // if the second "indexStart" value is prefixed with '+'
            // the value is relative to the data-fragment-index of its nearest ancestor
            if (values[1][0] === '+') {
                options.initRelative = true;
            } else {
                options.initRelative = false;
            }
            options.indexStart = parseInt(values[1]);
        }
        if (values.length >= 3 && values[2].length > 0) {
            options.indexStep = parseInt(values[2]);
        }
    }

    isHeading(element) {
        return element.nodeName.match(/^H[1-6]$/);
    }
    isPresenterNotes(element) {
        return (element.nodeName === "ASIDE" && element.classList.contains("notes"));
    }

    // return top-level elements in the content area of the slide
    // i.e. return all elements except the first heading element and presenter-notes elements
    getContentElements(slide) { 
        // is there any element at all?
        if (slide.children.length === 0) return [];
        
        let content = [];
        // if the first child element is heading, skip it
        let i = (this.isHeading(slide.children[0])) ? 1 : 0;
        for (; i < slide.children.length; i++) {
            // if the child element is a presenter notes, skip it
            if (this.isPresenterNotes(slide.children[i])) continue;
            content.push(slide.children[i]);
        }

        return content;
    }

    // automatically add fragment class and data-fragment-index attribute to the slide elements
    processSlide(slide) {

        //
        // get auto-fragment option values
        //
        // get the default option
        let options = {...this.options};
        // if this is a title slide, disable auto-fragment unless it is explicitly set within the slide
        if (slide.classList.contains("title-slide")) options.enabled = false;
        // get the option from the slide element
        this.getOptionsFromAttr(options, slide);
        // get the option from the first heading element
        if (slide.children.length > 0 && this.isHeading(slide.children[0])) {
            this.getOptionsFromAttr(options, slide.children[0]);
        }

        // if auto-fragment is not enabled for the slide, we are done
        if (!options.enabled) return;

        // get all top-level content elements from the slide
        let contentElements = this.getContentElements(slide);

        // go down the DOM tree until there are multiple elements to apply auto-fragment
        while (contentElements.length === 1) {
            contentElements = contentElements[0].children;
        }
        if (contentElements.length > 1) {
            // apply auto-fragment
            this.addFragment(contentElements, options);
        }
    }

    init(reveal) {
        // save reveal to deck
        this.deck = reveal;

        // get user-provided configuration options
        if (reveal.getConfig()[this.id]) {
            Object.assign(this.options, reveal.getConfig()[this.id]); 
        }

        // apply auto-fragment to top-level elements of each slide
        for (let slide of reveal.getSlides()) {
            this.processSlide(slide);
        }

        // if there are any remaining data-auto-fragment attributes,
        // apply auto-fragment to their children
        for (let element of reveal.getRevealElement().querySelectorAll("[data-auto-fragment]")) {
            // first get the options
            let options = {...this.options};
            this.getOptionsFromAttr(options, element);
            while (element.children.length === 1) {
                element = element.children[0];
            }
            if (element.children.length > 1) {
                this.addFragment(element.children, options);
            }
        }
    }
};

/* Reveal.js plugin API:
   (1) The plugin js file must create one global object
   (2) The global object should be (a function that returns) 
       an object with `id` property (of string type)
       and optionally `init` property (of function type)
   (3) The global object's name will be listed in the `plugins: [ ... ]`
       property during slide deck initialization
   (4) The object's `id` is the "key" the plugin is registered with
   (5) If exists, the `init` method will be called as part of the slide 
       initialization process
   (6) If the `init` method returns a promise, the slide "ready" event 
       is fired only after the promise resolves

   The global variable RevealFragment will be the plugin's global object.
   If RevealFragment already exists, we don't need to do anything */

window.RevealAutoFragment = window.RevealAutoFragment || new AutoFragmentPlugIn(); 
