// client/src/components/Avatar.jsx
import { pickColor, getInitials } from '../utils/helpers';

const Avatar = ({ username, size = 36 }) => {
  const color = pickColor(username);
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        background:     color + '1a',
        color,
        border:         `2px solid ${color}55`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontWeight:     800,
        fontSize:       Math.floor(size * 0.36),
        flexShrink:     0,
        userSelect:     'none',
      }}
    >
      {getInitials(username)}
    </div>
  );
};

export default Avatar;
