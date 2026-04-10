// Typewriter effect logic
const typeWriterElement = document.querySelector('.typing-text');
const textArray = ["Artificial Intelligence Engineer", "Machine Learning Enthusiast", "Deep Learning Architect"];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingDelay = 100;
const erasingDelay = 50;
const newTextDelay = 2000; // Delay between current and next text

function type() {
    const currentText = textArray[textIndex];
    
    if (isDeleting) {
        // remove char
        typeWriterElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        // add char
        typeWriterElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? erasingDelay : typingDelay;

    if (!isDeleting && charIndex === currentText.length) {
        // finished typing one word
        typeSpeed = newTextDelay;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        // finished deleting
        isDeleting = false;
        textIndex = (textIndex + 1) % textArray.length; // move to next word
        typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
}

// Scroll Reveal functionality
function reveal() {
    var reveals = document.querySelectorAll(".reveal");

    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;

        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}

// Background Blob movements (tracking mouse slightly)
const blobs = document.querySelectorAll('.blob');
document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    blobs.forEach((blob, index) => {
        const speed = index === 0 ? 30 : -30;
        blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
});

// Event Listeners
window.addEventListener("scroll", reveal);
document.addEventListener("DOMContentLoaded", () => {
    // Initial calls
    if (textArray.length) setTimeout(type, newTextDelay + 250);
    reveal();

});
