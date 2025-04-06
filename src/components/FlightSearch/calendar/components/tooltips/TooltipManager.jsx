/**
 * TooltipManager.jsx
 * Handles the display, positioning, and management of tooltips including pinned tooltips
 */

import createDetailedTooltip from './DetailedTooltip';
import createEnhancedTooltip from './EnhancedTooltip';

/**
 * Shows a tooltip with proper positioning and fade-in effect
 * @param {Event} e - The event that triggered the tooltip (for positioning)
 * @param {string} classCode - The class code (Y/W/J/F) to show tooltip for
 * @param {Array} flights - The flight data to display
 * @param {string} tooltipId - Unique ID for the tooltip
 * @param {string} route - The route for this flight
 * @param {string} activeTooltipRef - Reference to track active tooltip
 * @param {string} pinnedTooltipId - Currently pinned tooltip ID if any
 * @param {boolean} isDetailedView - Whether to show detailed or enhanced tooltip
 * @param {Object} currencyFilter - Currency filter settings
 * @param {boolean} directFilter - Whether direct flights filter is applied
 * @param {Object} airlinesFilter - Airlines filter configuration
 * @param {Array} pointsFilter - Points range filter
 * @param {Object} timeFilters - Time-based filters (departure, arrival, duration)
 * @returns {HTMLElement} - The created tooltip element
 */
const showTooltip = (e, classCode, flights, tooltipId, route, activeTooltipRef, pinnedTooltipId, isDetailedView, currencyFilter, directFilter, airlinesFilter, pointsFilter, timeFilters) => {
  if (!flights || flights.length === 0) return;
  
  // Remove any existing tooltip with the same ID
  const existingTooltip = document.getElementById(tooltipId);
  if (existingTooltip) {
    // Clear any pending hide timer
    if (existingTooltip.hideTimer) {
      clearTimeout(existingTooltip.hideTimer);
      existingTooltip.hideTimer = null;
    }
    document.body.removeChild(existingTooltip);
  }
  
  // Also remove any other active tooltips that aren't pinned
  if (activeTooltipRef.current && activeTooltipRef.current !== tooltipId && activeTooltipRef.current !== pinnedTooltipId) {
    const oldTooltip = document.getElementById(activeTooltipRef.current);
    if (oldTooltip) {
      // Clear any pending hide timer
      if (oldTooltip.hideTimer) {
        clearTimeout(oldTooltip.hideTimer);
        oldTooltip.hideTimer = null;
      }
      document.body.removeChild(oldTooltip);
    }
  }
  
  // Save current tooltip ID as active
  activeTooltipRef.current = tooltipId;
  
  // Create and populate the tooltip element based on view mode
  const tooltip = isDetailedView 
    ? createDetailedTooltip(classCode, flights, route, currencyFilter, directFilter, airlinesFilter, pointsFilter, timeFilters)
    : createEnhancedTooltip(classCode, flights, route, currencyFilter, directFilter, airlinesFilter, pointsFilter);
  tooltip.id = tooltipId;
  tooltip.style.position = 'fixed';
  tooltip.style.zIndex = '1000';
  tooltip.style.opacity = '0'; // Start invisible for smooth fade-in
  tooltip.isMouseOver = false; // Track mouse state
  tooltip.isPinned = tooltipId === pinnedTooltipId; // Track pinned state directly on DOM element
  
  // Add box-sizing to ensure padding and borders are included in dimensions
  tooltip.style.boxSizing = 'border-box';
  
  // Add event listeners to track mouse entering/leaving the tooltip
  tooltip.addEventListener('mouseenter', () => {
    tooltip.isMouseOver = true;
  });
  
  tooltip.addEventListener('mouseleave', () => {
    tooltip.isMouseOver = false;
    // Only hide if not pinned
    if (!tooltip.isPinned) {
      hideTooltip(tooltipId, pinnedTooltipId, activeTooltipRef);
    }
  });
  
  // First set position offscreen but displayed to measure natural size
  tooltip.style.left = '-9999px';
  tooltip.style.top = '-9999px';
  
  // Add tooltip to the document body to get its dimensions
  document.body.appendChild(tooltip);
  
  // Calculate optimal position and size to ensure tooltip stays within viewport
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Set maximum dimensions for tooltip (leave 40px margin on each side)
  const maxWidth = viewportWidth - 80;
  const maxHeight = viewportHeight - 80;
  
  // Check if tooltip needs size constraints - always apply max dimensions
  tooltip.style.maxWidth = `${maxWidth}px`;
  tooltip.style.maxHeight = `${maxHeight}px`;
  
  // Force all children to respect container boundaries
  tooltip.style.contain = 'content';
  
  // Enable scrolling if needed - vertical only, prevent horizontal scrolling
  tooltip.style.overflowX = 'hidden';
  tooltip.style.overflowY = 'auto';
  
  // Ensure wide content is handled properly with word wrapping where possible
  tooltip.style.wordWrap = 'break-word';
  tooltip.style.whiteSpace = 'normal';
  
  // Get updated dimensions after constraints
  const updatedRect = tooltip.getBoundingClientRect();
  
  // Use final constrained dimensions for positioning
  const finalWidth = Math.min(tooltipRect.width, maxWidth);
  const finalHeight = Math.min(tooltipRect.height, maxHeight);
  
  // Calculate best position to place tooltip near cursor but fully on screen
  let left, top;
  
  // Try positioning to the right of cursor first
  left = e.clientX + 10;
  if (left + finalWidth > viewportWidth - 20) {
    // Not enough space to the right, try left
    left = e.clientX - finalWidth - 10;
    
    // If still not enough space, center horizontally
    if (left < 20) {
      left = Math.max(20, Math.min(e.clientX - (finalWidth / 2), viewportWidth - finalWidth - 20));
    }
  }
  
  // Try positioning below cursor first
  top = e.clientY + 10;
  if (top + finalHeight > viewportHeight - 20) {
    // Not enough space below, try above
    top = e.clientY - finalHeight - 10;
    
    // If still not enough space, center vertically
    if (top < 20) {
      top = Math.max(20, Math.min(e.clientY - (finalHeight / 2), viewportHeight - finalHeight - 20));
    }
  }
  
  // Apply calculated position
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  
  // Add resize observer to handle any dynamic content changes
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const contentRect = entry.contentRect;
      
      // Reposition if size changes significantly
      if (Math.abs(contentRect.width - finalWidth) > 5 || 
          Math.abs(contentRect.height - finalHeight) > 5) {
        
        // Recalculate position with new dimensions
        let newLeft = left;
        let newTop = top;
        
        // Ensure tooltip stays within viewport with new dimensions
        if (newLeft + contentRect.width > viewportWidth - 20) {
          newLeft = Math.max(20, viewportWidth - contentRect.width - 20);
        }
        
        if (newTop + contentRect.height > viewportHeight - 20) {
          newTop = Math.max(20, viewportHeight - contentRect.height - 20);
        }
        
        tooltip.style.left = `${newLeft}px`;
        tooltip.style.top = `${newTop}px`;
      }
    }
  });
  
  resizeObserver.observe(tooltip);
  
  // Store the observer to disconnect it when tooltip is removed
  tooltip.resizeObserver = resizeObserver;
  
  // Store original trigger element ID to facilitate hover tracking
  tooltip.triggerElementId = e.target.getAttribute('data-tooltip-id');
  
  // Fade in the tooltip
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 10);
  
  return tooltip;
};

/**
 * Hides a tooltip with fade-out effect if it's not pinned
 * @param {string} tooltipId - ID of the tooltip to hide
 * @param {string} pinnedTooltipId - Currently pinned tooltip ID if any
 * @param {React.MutableRefObject} activeTooltipRef - Reference to track active tooltip
 */
const hideTooltip = (tooltipId, pinnedTooltipId, activeTooltipRef) => {
  const tooltip = document.getElementById(tooltipId);
  if (!tooltip) return;
  
  // Don't hide if this is the pinned tooltip
  if (tooltip.isPinned || tooltipId === pinnedTooltipId) return;
  
  // Don't hide if mouse is over the tooltip
  if (tooltip.isMouseOver) {
    return;
  }
  
  // Fade out and then remove tooltip
  tooltip.style.opacity = '0';
  
  setTimeout(() => {
    if (tooltip.parentNode) {
      // Disconnect any resize observer before removing
      if (tooltip.resizeObserver) {
        tooltip.resizeObserver.disconnect();
      }
      document.body.removeChild(tooltip);
    }
    if (activeTooltipRef.current === tooltipId) {
      activeTooltipRef.current = null;
    }
  }, 200);
};

/**
 * Sets up tooltip management hooks and effects in a React component
 * @param {Function} React - The React library
 * @returns {Object} - Object containing tooltip management functions and state
 */
const useTooltipManager = (React) => {
  const { useState, useRef, useEffect } = React;
  
  // Ref to track active tooltip
  const activeTooltipRef = useRef(null);
  
  // State to track pinned tooltip
  const [pinnedTooltipId, setPinnedTooltipId] = useState(null);
  
  // Wrapper for setPinnedTooltipId that also updates DOM element
  const setPinnedTooltipIdWithDomUpdate = (tooltipId) => {
    // If there's a currently pinned tooltip, unset its isPinned property
    if (pinnedTooltipId) {
      const oldPinnedTooltip = document.getElementById(pinnedTooltipId);
      if (oldPinnedTooltip) {
        oldPinnedTooltip.isPinned = false;
      }
    }
    
    // Set isPinned on the new tooltip
    if (tooltipId) {
      const newPinnedTooltip = document.getElementById(tooltipId);
      if (newPinnedTooltip) {
        newPinnedTooltip.isPinned = true;
      }
    }
    
    // Update state
    setPinnedTooltipId(tooltipId);
  };
  
  // Cleanup effect for tooltips
  useEffect(() => {
    return () => {
      // Clean up any tooltips when component unmounts
      if (activeTooltipRef.current) {
        const tooltip = document.getElementById(activeTooltipRef.current);
        if (tooltip && tooltip.parentNode) {
          document.body.removeChild(tooltip);
        }
      }
    };
  }, []);
  
  // Effect to handle clicks outside tooltip for closing pinned tooltips
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pinnedTooltipId) {
        const tooltip = document.getElementById(pinnedTooltipId);
        // If tooltip exists and the click is outside of it, unpin it
        if (tooltip && !tooltip.contains(e.target)) {
          // Only close if the click is not on a badge element
          const badgeClicked = e.target.closest('[data-badge="true"]');
          
          // If we clicked on a badge, check if it's the same as the current pinned tooltip
          if (badgeClicked) {
            const badgeTooltipId = badgeClicked.getAttribute('data-tooltip-id');
            // If this is the same badge that triggered the current tooltip, don't close
            if (badgeTooltipId === pinnedTooltipId) {
              return;
            }
          }
          
          // Fade out the tooltip
          tooltip.style.opacity = '0';
          setTimeout(() => {
            if (tooltip.parentNode) {
              document.body.removeChild(tooltip);
            }
            if (activeTooltipRef.current === pinnedTooltipId) {
              activeTooltipRef.current = null;
            }
            setPinnedTooltipIdWithDomUpdate(null);
          }, 200);
        }
      }
    };
    
    // Add click listener to document
    document.addEventListener('click', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [pinnedTooltipId]);
  
  // Wrapper for showTooltip that includes the current refs
  const showTooltipWithRefs = (e, classCode, flights, tooltipId, route, isDetailedView, currencyFilter, directFilter, airlinesFilter, pointsFilter, timeFilters) => {
    return showTooltip(
      e, 
      classCode, 
      flights, 
      tooltipId,
      route,
      activeTooltipRef, 
      pinnedTooltipId,
      isDetailedView,
      currencyFilter,
      directFilter,
      airlinesFilter,
      pointsFilter,
      timeFilters
    );
  };
  
  // Wrapper for hideTooltip that includes the current refs
  const hideTooltipWithRefs = (tooltipId) => {
    return hideTooltip(tooltipId, pinnedTooltipId, activeTooltipRef);
  };
  
  return {
    activeTooltipRef,
    pinnedTooltipId,
    setPinnedTooltipId: setPinnedTooltipIdWithDomUpdate,
    showTooltip: showTooltipWithRefs,
    hideTooltip: hideTooltipWithRefs
  };
};

export {
  showTooltip,
  hideTooltip,
  useTooltipManager
}; 