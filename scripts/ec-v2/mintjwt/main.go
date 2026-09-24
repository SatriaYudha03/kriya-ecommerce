package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	email := flag.String("email", "", "Email of the user to mint JWT for")
	flag.Parse()

	if *email == "" {
		log.Fatal("-email flag is required")
	}

	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	dbUrl := os.Getenv("SUPABASE_DB_URL")
	if dbUrl == "" {
		log.Fatal("SUPABASE_DB_URL is required in .env")
	}

	secretStr := os.Getenv("SUPABASE_JWT_SECRET")
	if secretStr == "" {
		log.Fatal("SUPABASE_JWT_SECRET is required in .env")
	}

	db, err := gorm.Open(postgres.Open(dbUrl), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	var user struct {
		ID   string
		Role string
	}

	err = db.Raw(`
		SELECT u.id, p.role 
		FROM auth.users u 
		JOIN public.profiles p ON u.id = p.id 
		WHERE u.email = ?
	`, *email).Scan(&user).Error
	
	if err != nil {
		log.Fatalf("failed to query user: %v", err)
	}

	if user.ID == "" {
		log.Fatalf("user with email %s not found", *email)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"aud":  "authenticated",
		"role": "authenticated",
		"sub":  user.ID,
		"email": *email,
		"exp": time.Now().Add(time.Hour * 24 * 30).Unix(),
		"iat": time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(secretStr))
	if err != nil {
		log.Fatalf("failed to sign token: %v", err)
	}

	fmt.Println(tokenString)
}
