from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.storage import store_listing_image
from app.models.image import ListingImage
from app.models.listing import Listing
from app.services.listing_service import ListingService


class ImageService:
    def __init__(self, db: Session):
        self.db = db

    def upload_listing_image(self, listing: Listing, upload: UploadFile) -> ListingImage:
        image_data = store_listing_image(listing.public_id, upload)
        return ListingService(self.db).add_image(listing, image_data)

