import { View } from 'godot-react-ui';

export function SearchChevronUp({ className = 'border-slate-600' }: { className?: string }) {
  return (
    <View className="w-3.5 h-3.5 items-center justify-center pointer-events-none">
      <View className={`w-1.5 h-1.5 border-t-2 border-l-2 ${className} rotate-45 translate-y-0.5`} />
    </View>
  );
}

export function SearchChevronDown({ className = 'border-slate-600' }: { className?: string }) {
  return (
    <View className="w-3.5 h-3.5 items-center justify-center pointer-events-none">
      <View className={`w-1.5 h-1.5 border-b-2 border-r-2 ${className} rotate-45 -translate-y-0.5`} />
    </View>
  );
}

export function SearchClose({ className = 'bg-slate-500' }: { className?: string }) {
  return (
    <View className="w-3.5 h-3.5 relative items-center justify-center pointer-events-none">
      <View className={`absolute w-3 h-0.5 ${className} rotate-45 rounded-full`} />
      <View className={`absolute w-3 h-0.5 ${className} -rotate-45 rounded-full`} />
    </View>
  );
}
