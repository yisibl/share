/*
  LayerStack

  Splits an element's multiple backgrounds into separate layers (DOM elements)
  so that each layer corresponds to one of the original element's backgrounds.

  Visualize in 3D.
*/
function LayerStack(el) {
  var _qs = document.querySelector.bind(document);

  if (!el) {
    throw Error('Missing input element');
    return;
  }

  function getBackgroundLayers(el) {
    var style = window.getComputedStyle(el)

    // TODO: add support for separate border declarations
    var border = style.getPropertyValue('border');

    var images = style.getPropertyValue('background-image');

    /* Add an extra paranthesis at end of each gradient declaration,
    then split by one paranthesis and comma to yield an array of valid
    gradient declarations.
    */
    images = images.replace(/\),/gi, ')),').split('),');

    var layers = images.map(function(img) {
      return { 'background-image': img }
    });

    // All other bg properties can be split by comma.
    var props = ['background-size', 'background-repeat', 'background-position', 'background-origin'];
    props.forEach(function(prop) {
      style.getPropertyValue(prop).split(',').forEach(function(value, index) {
        layers[index][prop] = value.trim();
        layers[index]['border'] = border;

        // TODO find actual box sizing
        layers[index]['box-sizing'] = 'border-box';
      })
    })

    console.log(layers)

    return layers;
  }

  var sourceEl = el;
  var sourceElBox = sourceEl.getBoundingClientRect();
  var sourceElBgLayers = getBackgroundLayers(sourceEl);

  var stack = document.createElement('div');
  stack.classList.add('bg-stack');

  var stackContainer = document.createElement('div');
  stackContainer.classList.add('bg-stack-container');
  stackContainer.appendChild(stack);

  sourceElBgLayers.forEach(function(layer) {
    var stackLayer = document.createElement('div')
    stackLayer.classList.add('bg-stack__layer');
    for (var prop in layer){
      stackLayer.style[prop] = layer[prop];
    }

    // DOM order is reverse z-order; insert bottom layers at top of stack;
    stack.insertBefore(stackLayer, stack.firstChild)
  })

  for (var key in sourceElBox) {
    stackContainer.style[key] = sourceElBox[key] + 'px';
  }

  sourceEl.parentElement.appendChild(stackContainer);

  // Add animated class after appending to DOM so we get smooth transition
  requestAnimationFrame(function(){
    stackContainer.classList.add('animated');
  })

  // Add stylesheet with dynamic values for CSS Variables set by mouse position
  var cssVars = document.createElement('style');
  document.head.appendChild(cssVars);

  var maxRotation = 60; // max Z rotation (from -30deg to 30deg)
  var minRotation = 0;
  var minLayerOffset = 1;
  var maxLayerOffset = 4; // max Y layer offset; used in CSS as multiplier
  var maxWidth = window.innerWidth;
  var maxHeight = window.innerHeight;

  var ticking = false;
  var mouseX = 0;
  var mouseY = 0;

  function updateCSSVars() {
    ticking = false;

    var xoffset = -1 * ((maxRotation / 2) - (maxRotation / maxWidth) * mouseX);
    var yoffset = maxLayerOffset - (maxLayerOffset / maxHeight) * mouseY;

    cssVars.innerHTML = `:root { --xoffset: ${xoffset}; --yoffset: ${yoffset} }`;
  }

  function update(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if(!ticking) {
      requestAnimationFrame(updateCSSVars);
    }

    ticking = true;
  }

  document.addEventListener('mousemove', update);

  var _events = {};

  return {
    destroy: function(options){
      document.removeEventListener('mousemove', update);
      stackContainer.classList.remove('animated');
      var self = this;

      function destroyDOM(e) {
        cssVars.parentElement.removeChild(cssVars);
        stackContainer.removeEventListener('transitionend', destroyDOM)
        stackContainer.parentElement.removeChild(stackContainer);
        self.trigger('afterdestroy');
      }

      if (options && options.immediate) {
        destroyDOM();
      } else {
        stackContainer.addEventListener('transitionend', destroyDOM)
      }
    },

    on: function(event, fn) {
      if (!_events[event]) {
        _events[event] = [];
      }
      _events[event].push(fn);
    },

    trigger: function(event, data) {
      if (_events[event]) {
        _events[event].forEach(function(fn){
          fn.call(this, data);
        })
      }
    }

  }
}
