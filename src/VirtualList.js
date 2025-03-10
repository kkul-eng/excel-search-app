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

  // Scroll to a specific index
  const scrollToIndex = (index) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * rowHeight;
    }
  };

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  // Expose scrollToIndex to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex,
  }), [rowHeight]);

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
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {visibleItems.map(({ index, style }) => rowRenderer({ index, key: `row-${index}`, style }))}
      </div>
    </div>
  );
});

export default VirtualList;
