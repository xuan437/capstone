

const PhotoViewerModal = ({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Photo</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: "center" }}>
          <img src={imageUrl} alt="Photo" style={{ maxWidth: "100%", borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
};

export default PhotoViewerModal;
