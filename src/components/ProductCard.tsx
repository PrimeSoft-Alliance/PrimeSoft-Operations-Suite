import React from 'react';
import { Trash2, Pencil, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

interface Product {
  _id?: string;
  title: string;
  description: string;
  price?: number;
  category: string;
  sku: string;
  stock: number;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  tags: string[];
  type: 'product' | 'service';
  deliveryFormat?: 'physical' | 'digital' | 'service';
  businessType?: 'ecommerce' | 'service' | 'hybrid';
  externalReferenceId?: string;
  link?: string;
  aiInstructions?: string;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isSelectionMode: boolean;
  onLongPress: (id: string) => void;
  onClick: (product: Product) => void;
  handleDeleteProduct: (id: string, e?: React.MouseEvent) => void;
  handleOpenEditModal: (product: Product, e?: React.MouseEvent) => void;
  setProductToDelete: (product: Product | null) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected,
  isSelectionMode,
  onLongPress,
  onClick,
  handleDeleteProduct,
  handleOpenEditModal,
  setProductToDelete
}) => {
  const { isPressed, ...longPressProps } = useLongPress({
    onLongPress: () => onLongPress(product._id!),
    onClick: () => onClick(product),
    disabled: isSelectionMode,
  });

  return (
    <motion.div 
      key={product._id}
      layoutId={product._id}
      {...longPressProps}
      className={cn(
        "bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group flex flex-col relative",
        isSelected && "ring-4 ring-indigo-500/20 border-indigo-500 bg-indigo-50/10 shadow-xl shadow-indigo-600/10",
        isPressed && "scale-[0.98] opacity-90 transition-all duration-200"
      )}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="w-full h-12 bg-slate-50 flex items-center justify-center text-slate-300 border-b border-slate-100">
        <Package className="w-6 h-6" />
      </div>

      <div className="p-5 flex-1 flex flex-col relative">
        <AnimatePresence>
          {isSelectionMode && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-4 -left-2 z-30"
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all",
                isSelected 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30" 
                  : "bg-white/80 backdrop-blur-sm border-slate-200 text-transparent"
              )}>
                <Check className="w-5 h-5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
              product.availability === 'in_stock' ? "bg-emerald-50 text-emerald-700" :
              product.availability === 'out_of_stock' ? "bg-rose-50 text-rose-700" :
              "bg-amber-50 text-amber-700"
            )}>
              {(product.availability || 'in_stock').replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isSelectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProduct(product._id!);
                }}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-md text-slate-300 hover:text-rose-600 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">{product.type}</span>
          </div>
        </div>
        
        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{product.title}</h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
        
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="text-sm font-black text-slate-900">
            {product.price !== undefined ? `$${product.price}` : 'TBD'}
          </div>
          <div className="flex gap-2">
            {!isSelectionMode && (
              <>
                <button 
                  onClick={(e) => handleOpenEditModal(product, e)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  title="Edit Item"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setProductToDelete(product);
                  }}
                  className="p-1.5 bg-rose-50 hover:bg-rose-200 text-rose-600 rounded-lg transition-colors"
                  title="Delete Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
