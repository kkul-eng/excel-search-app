import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const VirtualList = forwardRef(({ items, height, rowHeight, rowRenderer }, ref) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleItems, setVisibleItems] = useState([]);

  // Calculate visible items when scrolling
  useEffect(() => {
    if (!items || !containerRef.current) return;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight));
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + height) / rowHeight)
    );
    
    const visibleRows = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleRows.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          top: i * rowHeight,
          height: rowHeight,
          left: 0,
          right: 0
        }
      });
    }
    
    setVisibleItems(visibleRows);
  }, [items, scrollTop, height, rowHeight]);

  // Enhanced scrollToIndex to support alignment options
  const scrollToIndex = (options) => {
    if (!containerRef.current) return;
    
    let index;
    let align = 'top';
    
    // Support both direct index or options object with index and align
    if (typeof options === 'object') {
      index = options.index;
      align = options.align || 'top';
    } else {
      index = options;
    }
    
    if (index < 0 || index >= (items?.length || 0)) return;
    
    // Calculate scroll position based on alignment
    let scrollPosition;
    switch (align) {
      case 'center':
        // Center the row in the viewport
        scrollPosition = Math.max(
          0,
          index * rowHeight - (height - rowHeight) / 2
        );
        break;
      case 'end':
      case 'bottom':
        // Align to bottom
        scrollPosition = (index + 1) * rowHeight - height;
        break;
      case 'start':
      case 'top':
      default:
        // Align to top (default behavior)
        scrollPosition = index * rowHeight;
        break;
    }
    
    containerRef.current.scrollTop = scrollPosition;
  };

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  // Expose scrollToIndex to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex,
  }), [items, height, rowHeight]);

  return (
    <div
      ref={containerRef}
      style={{ 
        height, 
        overflow: 'auto', 
        position: 'relative',
        scrollbarWidth: 'auto',
        scrollbarColor: '#2563eb #e2e8f0'
      }}
      onScroll={handleScroll}
      className="custom-scrollbar"
    >
      <div style={{ height: items ? items.length * rowHeight : 0, position: 'relative' }}>
        {visibleItems.map(({ index, style }) => rowRenderer({ index, key: `row-${index}`, style }))}
      </div>
    </div>
  );
});

export default VirtualList;
