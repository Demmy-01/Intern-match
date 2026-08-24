import logoImg from '../assets/logo.png';

interface Props {
  className?: string;
  size?: number;
}


export default function Logo({ className = '', size = 36 }: Props) {
  return (
    <img
      src={logoImg}
      alt="InternMatch Logo"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`object-contain rounded-lg flex-shrink-0 ${className}`}
    />
  );
}
