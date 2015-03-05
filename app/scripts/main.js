/* global jQuery:false, Starfield: false */

(function() {
  // Needed for proper code
  'use strict';

  // Set star background
  var container = document.getElementById('starfield');
  var starfield = new Starfield();
  starfield.initialise(container);
  starfield.start();

})(jQuery);
