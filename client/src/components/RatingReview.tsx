/**
 * Rating and Review Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Star rating display
 * - Comment submission
 * - User feedback storage
 */

import { useState, useEffect } from 'react';
import { Star, Send } from 'lucide-react';
import { RatingsStorage, RecipeRating } from '@/lib/storage';
import { Button } from '@/components/ui/button';

interface RatingReviewProps {
  recipeId: number;
}

export default function RatingReview({ recipeId }: RatingReviewProps) {
  const [rating, setRating] = useState<RecipeRating | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedRating = RatingsStorage.get(recipeId);
    if (savedRating) {
      setRating(savedRating);
      setComment(savedRating.comment);
    }
  }, [recipeId]);

  const handleSubmitRating = () => {
    if (hoverRating === 0 && !rating) {
      alert('Please select a rating');
      return;
    }

    const newRating: RecipeRating = {
      recipeId,
      rating: hoverRating || rating?.rating || 0,
      comment,
      ratedAt: Date.now(),
    };

    RatingsStorage.save(newRating);
    setRating(newRating);
    setIsEditing(false);
    setHoverRating(0);
  };

  const handleDeleteRating = () => {
    RatingsStorage.delete(recipeId);
    setRating(null);
    setComment('');
    setIsEditing(false);
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
      <h3 className="font-merriweather font-bold text-lg text-orange-900 mb-4">
        ⭐ Rate This Recipe
      </h3>

      {rating && !isEditing ? (
        <div className="space-y-4">
          {/* Display Rating */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= rating.rating
                      ? 'fill-orange-600 text-orange-600'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-lato text-gray-600">
              {rating.rating} out of 5
            </span>
          </div>

          {/* Display Comment */}
          {rating.comment && (
            <div className="bg-white p-3 rounded border border-orange-100">
              <p className="text-sm font-lato text-gray-700">{rating.comment}</p>
              <p className="text-xs text-gray-500 mt-2">
                Reviewed on {new Date(rating.ratedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Edit/Delete Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="text-sm"
            >
              Edit Rating
            </Button>
            <Button
              onClick={handleDeleteRating}
              variant="outline"
              className="text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              Delete Rating
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Star Rating Input */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setHoverRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating?.rating || 0)
                      ? 'fill-orange-600 text-orange-600'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Comment Input */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this recipe... (optional)"
            className="w-full p-3 border border-orange-200 rounded-lg font-lato text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 resize-none"
            rows={3}
          />

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmitRating}
              className="flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700"
            >
              <Send className="w-4 h-4" />
              Submit Rating
            </Button>
            {rating && (
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="text-sm"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
